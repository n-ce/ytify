#!/bin/bash

# Environment Setup Script
# usage: ./scripts/setup-env.sh

echo "🔧 Setting up environment variables..."

# ------------------------------------------------------------------------------
# 1. Setup Production Environment
# ------------------------------------------------------------------------------
echo "📝 Configuring Production Environment (music.ml4-lab.com)..."
if [ ! -f .env.production ]; then
    cp .env.production.example .env.production 2>/dev/null || touch .env.production
fi

# Function to prompt for variable
prompt_var() {
    local var_name=$1
    local current_val=$(grep "^$var_name=" .env.production | cut -d'=' -f2-)
    
    read -p "$var_name [$current_val]: " new_val
    if [ -n "$new_val" ]; then
        # Update or append variable
        if grep -q "^$var_name=" .env.production; then
            sed -i "s|^$var_name=.*|$var_name=$new_val|" .env.production
        else
            echo "$var_name=$new_val" >> .env.production
        fi
    fi
}

echo "Enter values for Production (leave blank to keep current):"
prompt_var "VITE_SPOTIFY_CLIENT_ID"
prompt_var "VITE_DEEZER_APP_ID"
prompt_var "VITE_SOUNDCLOUD_CLIENT_ID"

# ------------------------------------------------------------------------------
# 2. Setup Development Environment
# ------------------------------------------------------------------------------
echo "📝 Configuring Development Environment (ytify.ml4-lab.com)..."
if [ ! -f .env.development ]; then
    cp .env.development.example .env.development 2>/dev/null || touch .env.development
fi

# Similar prompts for dev...
# (Simplified for brevity, user can edit manually)
echo "Development config is at .env.development. Please edit it manually if needed."

echo "✅ Environment setup complete."
