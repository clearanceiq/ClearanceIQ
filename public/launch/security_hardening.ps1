# Security Hardening Script for Windows 10/11 Solo Operator
# Author: Hermes Agent
# Date: 2026-06-22
# Description: Applies network security settings. Idempotent - safe to rerun.
# Run as Administrator.

$ErrorActionPreference = 'SilentlyContinue'

function Write-Header {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Test-Administrator {
    $currentUserIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUserIdentity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

# Ensure the script is run with elevated privileges
if (-not (Test-Administrator)) {
    Write-Warning "This script must be run as Administrator for firewall and SMB modifications."
    Write-Host "Please re-run PowerShell as Administrator and try again." -ForegroundColor Red
    exit 1
}

# ==========================
# 1. Block inbound SMB (445) on public networks
# ==========================
Write-Header "Blocking inbound SMB (TCP 445) on Public profile"

# Check if rule already exists and is enabled
$smbPublicRule = Get-NetFirewallRule -DisplayName "Block Inbound SMB TCP 445 Public" -ErrorAction SilentlyContinue
if ($smbPublicRule) {
    if ($smbPublicRule.Action -ne 'Block') {
        Set-NetFirewallRule -DisplayName "Block Inbound SMB TCP 445 Public" -Direction Inbound -Protocol TCP -LocalPort 445 -Profile Public -Action Block
        Write-Host "Updated existing rule to Block action."
    } else {
        Write-Host "Rule already exists and blocking. Skipping."
    }
} else {
    New-NetFirewallRule -DisplayName "Block Inbound SMB TCP 445 Public" -Direction Inbound -Protocol TCP -LocalPort 445 -Profile Public -Action Block
    Write-Host "Created new blocking rule."
}

# ==========================
# 2. Disable SMBv1
# ==========================
Write-Header "Disabling SMBv1 (Server and Client)"

$smbServerFeature = Get-WindowsOptionalFeature -Online -FeatureName SMB1Protocol -ErrorAction SilentlyContinue
if ($smbServerFeature) {
    if ($smbServerFeature.State -ne 'Disabled') {
        Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol -NoRestart
        Write-Host "Disabled SMB1Protocol (Server)."
    } else {
        Write-Host "SMB1Protocol (Server) already disabled. Skipping."
    }
}

$smbClientFeature = Get-WindowsOptionalFeature -Online -FeatureName SMB1Protocol-Client -ErrorAction SilentlyContinue
if ($smbClientFeature) {
    if ($smbClientFeature.State -ne 'Disabled') {
        Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol-Client -NoRestart
        Write-Host "Disabled SMB1Protocol-Client."
    } else {
        Write-Host "SMB1Protocol-Client already disabled. Skipping."
    }
}

# ==========================
# 3. Restrict RPC Endpoint Mapper on public networks
# ==========================
Write-Header "Restricting RPC Endpoint Mapper on Public networks"

$rpcRuleName = "Restrict RPC Endpoint Mapper Public"

$rpcRule = Get-NetFirewallRule -DisplayName $rpcRuleName -ErrorAction SilentlyContinue
if ($rpcRule) {
    if ($rpcRule.Action -ne 'Block') {
        Set-NetFirewallRule -DisplayName $rpcRuleName -Direction Inbound -Protocol TCP -LocalPort 135 -Profile Public -Action Block
        Write-Host "Updated RPC rule to Block action."
    } else {
        Write-Host "RPC rule already blocking inbound on public. Skipping."
    }
} else {
    New-NetFirewallRule -DisplayName $rpcRuleName -Direction Inbound -Protocol TCP -LocalPort 135 -Profile Public -Action Block
    Write-Host "Created new rule to block RPC Endpoint Mapper on public."
}

# ==========================
# 4. Enable SMB signing
# ==========================
Write-Header "Enabling SMB signing"

# Requires registry edits for SMB server and client signing requirements
$smbServerRequiredSignature = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters" -Name "RequireSecuritySignature" -ErrorAction SilentlyContinue
if (-not $smbServerRequiredSignature -or $smbServerRequiredSignature.RequireSecuritySignature -ne 1) {
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters" -Name "RequireSecuritySignature" -Value 1 -Type DWord -ErrorAction SilentlyContinue
    Write-Host "Enabled SMB server signing requirement."
} else {
    Write-Host "SMB server signing requirement already enabled. Skipping."
}

$smbClientRequiredSignature = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanmanWorkstation\Parameters" -Name "RequireSecuritySignature" -ErrorAction SilentlyContinue
if (-not $smbClientRequiredSignature -or $smbClientRequiredSignature.RequireSecuritySignature -ne 1) {
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanmanWorkstation\Parameters" -Name "RequireSecuritySignature" -Value 1 -Type DWord -ErrorAction SilentlyContinue
    Write-Host "Enabled SMB client signing requirement."
} else {
    Write-Host "SMB client signing requirement already enabled. Skipping."
}

# ==========================
# 5. Allow local subnet 192.168.1.0/24 on Private profile in addition to public restrictions
# ==========================
Write-Header "Creating firewall rule to allow 192.168.1.0/24 on Private profile"

$localRuleName = "Allow Local Subnet 192.168.1.0/24 Private"

$localSubnetRule = Get-NetFirewallRule -DisplayName $localRuleName -ErrorAction SilentlyContinue
if ($localSubnetRule) {
    # Validate remote address if rule exists
    $existingFilter = $localSubnetRule | Get-NetFirewallAddressFilter -ErrorAction SilentlyContinue
    if ($existingFilter -and $existingFilter.RemoteAddress -eq "192.168.1.0/24") {
        Write-Host "Local subnet rule already configured correctly. Skipping."
    } else {
        # Reset filter if needed
        Remove-NetFirewallRule -DisplayName $localRuleName -ErrorAction SilentlyContinue
        New-NetFirewallRule -DisplayName $localRuleName -Direction Inbound -Profile Private -RemoteAddress 192.168.1.0/24 -Action Allow
        Write-Host "Recreated local subnet allow rule."
    }
} else {
    New-NetFirewallRule -DisplayName $localRuleName -Direction Inbound -Profile Private -RemoteAddress 192.168.1.0/24 -Action Allow
    Write-Host "Created new rule to allow local subnet on Private profile."
}

Write-Host "`nSecurity hardening complete. Review rules in Windows Defender Firewall settings." -ForegroundColor Green
