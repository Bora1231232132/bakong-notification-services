# Fix DNS Issue - bakong-notification.nbc.gov.kh

## Problem
Error: `DNS_PROBE_FINISHED_NXDOMAIN`
- Domain `bakong-notification.nbc.gov.kh` is not resolving
- DNS record doesn't exist or isn't configured

## Solutions

### Option 1: Access via IP Address (Immediate Solution)

While DNS is being fixed, you can access the application directly via IP:

**HTTP (Port 80):**
```
http://10.20.6.58
```

**HTTPS (Port 443) - if SSL is configured:**
```
https://10.20.6.58
```

**Direct API Access:**
```
http://10.20.6.58:8080/api/v1/health
```

### Option 2: Fix DNS (Permanent Solution)

You need to ask your IT/DNS administrator to create a DNS record:

**DNS Record Needed:**
- **Type**: A Record
- **Name**: `bakong-notification.nbc.gov.kh`
- **Value**: `10.20.6.58`
- **TTL**: 3600 (or default)

**Where to add:**
- Your organization's DNS server (likely managed by IT team)
- Domain: `nbc.gov.kh`

### Option 3: Use hosts file (Temporary Local Fix)

On your local computer, you can add a hosts file entry:

**Windows:**
1. Open `C:\Windows\System32\drivers\etc\hosts` as Administrator
2. Add line: `10.20.6.58 bakong-notification.nbc.gov.kh`
3. Save file

**Linux/Mac:**
1. Edit `/etc/hosts` with sudo
2. Add line: `10.20.6.58 bakong-notification.nbc.gov.kh`
3. Save file

**Note:** This only works on your computer, not for other users.

## Check Current DNS Status

On the server, check if DNS is configured:

```bash
nslookup bakong-notification.nbc.gov.kh
dig bakong-notification.nbc.gov.kh
```

If these return "NXDOMAIN" or no results, DNS is not configured.

## Next Steps

1. **Immediate**: Use IP address `http://10.20.6.58` to access the application
2. **Contact IT**: Ask them to create DNS A record for `bakong-notification.nbc.gov.kh` → `10.20.6.58`
3. **Wait for DNS propagation**: Usually takes 5 minutes to 48 hours
4. **Test**: Once DNS is configured, test `https://bakong-notification.nbc.gov.kh`

