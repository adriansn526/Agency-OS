#!/bin/bash

# Mesajul de commit poate fi dat ca argument; altfel se foloseste unul default
COMMIT_MSG=${1:-"Hotfix aplicat direct pe serverul de productie"}
REPO_DIR="/tmp/Agency-OS-Repo"
SRC_DIR="/home/asns/projects/AdvancedSystems/agency-os"

echo "==== Sincronizare Hotfix -> GitHub ===="
echo "1. Se copiaza fisierele in clona locala din $REPO_DIR..."

# Folosim rsync pentru a copia modificarile. Excludem folderele generate (node_modules, build etc.)
rsync -av --exclude='.next' \
          --exclude='node_modules' \
          --exclude='.git' \
          --exclude='.turbo' \
          --exclude='backups' \
          --exclude='scratch' \
          $SRC_DIR/ $REPO_DIR/

echo "2. Intram in repository si aplicam modificarile Git..."
cd $REPO_DIR

git add .
git commit -m "$COMMIT_MSG"

echo "3. Trimitem modificarile pe GitHub (push)..."
git push origin main

echo "==== Sincronizare finalizata cu succes! ===="
