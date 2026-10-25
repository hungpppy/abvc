"""Nhúng react-ui.js vào index.html (thẻ <script id="react-bundle">).
Dùng sau khi sửa src/ui.jsx:
  npx esbuild src/ui.jsx --bundle --minify --format=iife --jsx=automatic --define:process.env.NODE_ENV='"production"' --outfile=react-ui.js
  python build.py
"""
import re
h = open('index.html', encoding='utf-8').read()
b = open('react-ui.js', encoding='utf-8').read().replace('</script', '<\\/script')
new = '<script id="react-bundle">' + b + '</script>'
h2, n = re.subn(r'<script id="react-bundle">.*?</script>', lambda m: new, h, flags=re.S)
assert n == 1, 'Không thấy thẻ <script id="react-bundle"> trong index.html'
open('index.html', 'w', encoding='utf-8').write(h2)
print('Đã nhúng react-ui.js vào index.html')
