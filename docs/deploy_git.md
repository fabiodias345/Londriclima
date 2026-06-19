# Na máquina local
git switch dev
git status
git add -A
git commit -m "descreva o que mudou"
git push origin dev

git switch main
git merge --ff-only dev
git push origin main

git switch dev