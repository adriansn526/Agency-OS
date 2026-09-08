#!/bin/bash

# Preia mesajul de commit sau foloseste unul standard
COMMIT_MSG=${1:-"Update de pe serverul de productie"}

echo "1. Adaugam modificarile locale..."
git add .

echo "2. Facem commit (daca exista modificari)..."
git commit -m "$COMMIT_MSG" || echo "Nu sunt modificari locale de salvat."

echo "3. Preluam eventualele modificari noi de pe GitHub (pull)..."
git pull origin main --rebase

echo "4. Trimitem codul catre GitHub (push)..."
git push origin main

echo ""
echo "=========================================================="
echo "✅ Modificarile au fost trimise catre GitHub!"
echo "🚀 Acum GitHub Actions va incepe automat build-ul."
echo "Cand termina, va muta singur fisierele aici pe server"
echo "si va da restart la aplicatie."
echo "=========================================================="
