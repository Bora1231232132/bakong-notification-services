# SSL Certificate Setup Guide

## Problem with Let's Encrypt

Let's Encrypt failed because:
- **DNS Issue**: Domain points to `45.118.76.58` instead of `10.20.6.58`
- **Firewall Issue**: Port 80 is blocked from internet

## Solution: Use Existing Certificates from IT Team

Since Let's Encrypt requires internet access and proper DNS, the easiest solution is to use certificates from your IT team.

### Step 1: Get Certificates from IT Team

Ask your IT team for:
1. **Certificate file** (usually `.crt` or `.pem` file)
2. **Private key file** (usually `.key` or `.pem` file)

### Step 2: Upload Certificates to Server

**Option A: Using SCP (from your local computer)**
```bash
# From your local computer
scp certificate.crt dev@10.20.6.58:~/bakong-notification-services/ssl-certs/fullchain.pem
scp private.key dev@10.20.6.58:~/bakong-notification-services/ssl-certs/privkey.pem
```

**Option B: Copy-paste (if you have certificate content)**
```bash
# On the server
cd ~/bakong-notification-services
mkdir -p ssl-certs
nano ssl-certs/fullchain.pem  # Paste certificate content
nano ssl-certs/privkey.pem    # Paste private key content
chmod 644 ssl-certs/fullchain.pem
chmod 600 ssl-certs/privkey.pem
```

### Step 3: Run Setup Script

```bash
bash USE_EXISTING_SSL_CERTIFICATES.sh
```

This will:
- Copy certificates to the right location
- Restart frontend with SSL enabled
- Test HTTPS connection

### Step 4: Verify

Test in browser: `https://bakong-notification.nbc.gov.kh`

## Alternative: Fix DNS and Firewall for Let's Encrypt

If you want to use Let's Encrypt instead:

1. **Fix DNS**: Update DNS so `bakong-notification.nbc.gov.kh` points to `10.20.6.58`
2. **Open Firewall**: Allow port 80 from internet
3. **Run Let's Encrypt again**: `bash SETUP_SSL_NOW.sh`

## Quick Checklist

- [ ] Get certificates from IT team
- [ ] Upload to server (ssl-certs/ directory)
- [ ] Run `bash USE_EXISTING_SSL_CERTIFICATES.sh`
- [ ] Test: `https://bakong-notification.nbc.gov.kh`
- [ ] Verify certificate is valid

