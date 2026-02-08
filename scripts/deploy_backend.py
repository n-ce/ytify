#!/usr/bin/env python3
"""
Deploy ytify backend to Netcup VPS
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import paramiko
import os
import time

# VPS Connection
HOST = "100.92.200.92"  # Tailscale IP
USER = "root"
PASS = "y4qZ778wE6EBFgh"

# Paths
LOCAL_BACKEND = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend")
LOCAL_NGINX = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ytify.nginx.conf")
REMOTE_DIR = "/var/www/ytify"
REMOTE_BACKEND = f"{REMOTE_DIR}/backend"

def deploy():
    print(f"🚀 Deploying ytify backend to {HOST}...")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh.connect(HOST, username=USER, password=PASS, timeout=30)
        print("✅ Connected via SSH.")

        sftp = ssh.open_sftp()

        # 1. Ensure directories exist
        print("\n📁 Creating directories...")
        dirs_to_create = [
            REMOTE_DIR,
            REMOTE_BACKEND,
            f"{REMOTE_BACKEND}/src",
            f"{REMOTE_BACKEND}/src/routes",
            f"{REMOTE_BACKEND}/src/services",
            f"{REMOTE_BACKEND}/src/types",
            f"{REMOTE_BACKEND}/data",
        ]
        for d in dirs_to_create:
            stdin, stdout, stderr = ssh.exec_command(f"mkdir -p {d}")
            stdout.read()
        print("✅ Directories created.")

        # 2. Upload backend files
        print("\n📤 Uploading backend files...")
        files_to_upload = [
            ("deno.json", "deno.json"),
            ("Dockerfile", "Dockerfile"),
            ("docker compose.yml", "docker compose.yml"),
            (".env.example", ".env.example"),
            ("src/main.ts", "src/main.ts"),
            ("src/config.ts", "src/config.ts"),
            ("src/routes/index.ts", "src/routes/index.ts"),
            ("src/routes/hash.ts", "src/routes/hash.ts"),
            ("src/routes/library.ts", "src/routes/library.ts"),
            ("src/routes/sync.ts", "src/routes/sync.ts"),
            ("src/routes/fallback.ts", "src/routes/fallback.ts"),
            ("src/routes/static.ts", "src/routes/static.ts"),
            ("src/routes/linkPreview.ts", "src/routes/linkPreview.ts"),
            ("src/services/cache.ts", "src/services/cache.ts"),
            ("src/services/etag.ts", "src/services/etag.ts"),
            ("src/services/storage.ts", "src/services/storage.ts"),
            ("src/types/library.ts", "src/types/library.ts"),
        ]

        uploaded = 0
        for local, remote in files_to_upload:
            local_path = os.path.join(LOCAL_BACKEND, local)
            remote_path = f"{REMOTE_BACKEND}/{remote}"
            if os.path.exists(local_path):
                print(f"  📄 {local}")
                sftp.put(local_path, remote_path)
                uploaded += 1
            else:
                print(f"  ⚠️  SKIP (not found): {local}")

        print(f"✅ Uploaded {uploaded}/{len(files_to_upload)} files.")

        # 3. Upload nginx config
        print("\n📤 Uploading nginx config...")
        if os.path.exists(LOCAL_NGINX):
            sftp.put(LOCAL_NGINX, "/tmp/ytify.nginx.conf")
            print("✅ nginx config uploaded.")

        sftp.close()

        # 4. Create .env if not exists
        print("\n🔧 Configuring environment...")
        stdin, stdout, stderr = ssh.exec_command(f"""
            cd {REMOTE_BACKEND}
            if [ ! -f .env ]; then
                cp .env.example .env
                echo "Created .env from template"
            else
                echo ".env already exists"
            fi
        """)
        print(stdout.read().decode().strip())

        # 5. Check if Docker is installed
        print("\n🐳 Checking Docker...")
        stdin, stdout, stderr = ssh.exec_command("docker --version && docker compose --version")
        docker_out = stdout.read().decode().strip()
        docker_err = stderr.read().decode().strip()

        if "Docker version" in docker_out:
            print(f"✅ {docker_out.split(chr(10))[0]}")
        else:
            print("❌ Docker not found. Installing...")
            ssh.exec_command("curl -fsSL https://get.docker.com | sh")
            time.sleep(30)

        # 6. Build and start Docker container
        print("\n🏗️  Building and starting backend...")
        stdin, stdout, stderr = ssh.exec_command(f"""
            cd {REMOTE_BACKEND}
            docker compose down 2>/dev/null || true
            docker compose build --no-cache
            docker compose up -d
        """)
        # Wait for command to complete
        exit_status = stdout.channel.recv_exit_status()
        build_out = stdout.read().decode()
        build_err = stderr.read().decode()

        if exit_status == 0:
            print("✅ Docker container started.")
        else:
            print(f"⚠️  Docker build output:\n{build_out}\n{build_err}")

        # 7. Wait for backend to be healthy
        print("\n🔍 Checking backend health...")
        time.sleep(5)
        for i in range(10):
            stdin, stdout, stderr = ssh.exec_command("curl -sf http://localhost:3000/health 2>/dev/null")
            health = stdout.read().decode().strip()
            if health:
                print(f"✅ Backend healthy: {health}")
                break
            time.sleep(2)
            print(f"  Waiting... ({i+1}/10)")
        else:
            print("⚠️  Backend may not be ready yet. Check logs with: docker compose logs")

        # 8. Update nginx config
        print("\n🔄 Updating nginx...")
        stdin, stdout, stderr = ssh.exec_command("""
            # Check if config is different
            if ! diff -q /tmp/ytify.nginx.conf /etc/nginx/sites-available/ytify 2>/dev/null; then
                cp /tmp/ytify.nginx.conf /etc/nginx/sites-available/ytify

                # Enable site if not already
                ln -sf /etc/nginx/sites-available/ytify /etc/nginx/sites-enabled/ytify 2>/dev/null || true

                # Test and reload
                nginx -t && systemctl reload nginx
                echo "Nginx updated and reloaded"
            else
                echo "Nginx config unchanged"
            fi
        """)
        nginx_out = stdout.read().decode().strip()
        nginx_err = stderr.read().decode().strip()
        print(nginx_out or nginx_err or "✅ Nginx configuration checked.")

        # 9. Final status
        print("\n📊 Final status:")
        stdin, stdout, stderr = ssh.exec_command(f"""
            echo "=== Docker containers ==="
            docker ps --format "table {{{{.Names}}}}\\t{{{{.Status}}}}\\t{{{{.Ports}}}}" | grep -E "ytify|NAMES"
            echo ""
            echo "=== Backend health ==="
            curl -s http://localhost:3000/health || echo "Backend not responding"
            echo ""
            echo "=== Nginx status ==="
            systemctl is-active nginx
        """)
        print(stdout.read().decode())

        print("\n" + "="*50)
        print("🎉 DEPLOYMENT COMPLETE!")
        print("="*50)
        print(f"\n🌐 Your ytify backend is now running at:")
        print(f"   Internal: http://localhost:3000")
        print(f"   External: https://music.ml4-lab.com")
        print(f"\n📝 To view logs:")
        print(f"   ssh root@{HOST} 'cd {REMOTE_BACKEND} && docker compose logs -f'")

        ssh.close()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    deploy()
