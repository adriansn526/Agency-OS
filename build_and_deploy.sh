#!/bin/bash
cd /home/asns/projects/AdvancedSystems/agency-os/apps/web
npm run build
cp -r .next/standalone/apps/web/. ./ || true
cp -r .next/standalone/node_modules ../../ || true
sudo systemctl restart agency-os
