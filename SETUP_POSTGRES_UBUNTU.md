# PostgreSQL Setup on Ubuntu Server

## Step 1: Install PostgreSQL

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Check PostgreSQL version
psql --version

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

## Step 2: Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL prompt, run these commands:
```

### PostgreSQL Commands (run inside psql):

```sql
-- Create database
CREATE DATABASE crm_db;

-- Create user with password
CREATE USER crm_user WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE crm_db TO crm_user;

-- Connect to the database and grant schema privileges
\c crm_db
GRANT ALL ON SCHEMA public TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO crm_user;

-- Exit PostgreSQL
\q
```

## Step 3: Configure Remote Access (Optional)

If you need to connect from your local machine:

### Edit PostgreSQL Configuration:

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/*/main/postgresql.conf

# Find and uncomment/modify:
listen_addresses = '*'  # or specific IP
```

### Edit pg_hba.conf:

```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Add at the end (for password authentication):
host    crm_db    crm_user    0.0.0.0/0    md5

# Or for specific IP:
host    crm_db    crm_user    YOUR_LOCAL_IP/32    md5
```

### Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

## Step 4: Configure Firewall (if using UFW)

```bash
# Allow PostgreSQL port (5432)
sudo ufw allow 5432/tcp

# Or for specific IP:
sudo ufw allow from YOUR_LOCAL_IP to any port 5432

# Check firewall status
sudo ufw status
```

## Step 5: Test Connection

From your local machine or the server:

```bash
# Test connection
psql -h YOUR_SERVER_IP -U crm_user -d crm_db

# Or with connection string
psql "postgresql://crm_user:your_secure_password_here@YOUR_SERVER_IP:5432/crm_db"
```

## Step 6: Update Your Backend .env

Update `backend/.env` with:

```env
DATABASE_URL="postgresql://crm_user:your_secure_password_here@YOUR_SERVER_IP:5432/crm_db?schema=public"
```

## Security Best Practices

1. **Use strong passwords**: Generate a secure password for `crm_user`
2. **Limit access**: Use specific IP addresses in `pg_hba.conf` instead of `0.0.0.0/0`
3. **Use SSL**: For production, enable SSL connections
4. **Firewall rules**: Only allow necessary IPs to access port 5432
5. **Regular backups**: Set up automated backups

## Quick Setup Script (All-in-One)

```bash
#!/bin/bash
# Run as root or with sudo

# Install PostgreSQL
apt update
apt install postgresql postgresql-contrib -y
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE crm_db;
CREATE USER crm_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE crm_db TO crm_user;
\c crm_db
GRANT ALL ON SCHEMA public TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO crm_user;
\q
EOF

echo "PostgreSQL setup complete!"
echo "Database: crm_db"
echo "User: crm_user"
echo "Remember to change the password and configure remote access if needed!"
```

## Troubleshooting

### Connection Refused
- Check if PostgreSQL is running: `sudo systemctl status postgresql`
- Check if port 5432 is open: `sudo netstat -tlnp | grep 5432`
- Verify firewall rules

### Authentication Failed
- Check `pg_hba.conf` configuration
- Verify username and password
- Check if user has correct privileges

### Permission Denied
- Ensure user has proper grants
- Check schema permissions
- Verify database ownership


