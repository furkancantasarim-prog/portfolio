#!/usr/bin/env python3
"""
manifest-guncelle.py
====================
Bu script'i çalıştırdığında 'fotograf' ve 'grafik tasarim' klasörlerindeki
tüm görsel dosyaları tarar ve manifest.json dosyalarını otomatik günceller.

Kullanım:
  python3 manifest-guncelle.py

GitHub'a atmadan ÖNCE bu script'i çalıştır, sonra tüm dosyaları commit et.
"""

import json
import os

FOLDERS = [
    'fotograf',
    'grafik tasarim',
]

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'}

def update_manifest(folder):
    if not os.path.isdir(folder):
        print(f'[UYARI] Klasör bulunamadı: {folder}')
        return

    files = sorted([
        f for f in os.listdir(folder)
        if os.path.isfile(os.path.join(folder, f))
        and os.path.splitext(f)[1].lower() in IMAGE_EXTENSIONS
    ])

    manifest_path = os.path.join(folder, 'manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as fp:
        json.dump({'files': files}, fp, ensure_ascii=False, indent=2)

    print(f'[OK] {folder}/manifest.json güncellendi — {len(files)} dosya')

if __name__ == '__main__':
    for folder in FOLDERS:
        update_manifest(folder)
    print('\nBitti! Şimdi dosyaları GitHub\'a push edebilirsin.')
