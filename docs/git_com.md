Faça commit e deploy completo das alterações atuais.

1. Verifique branch, git status e diff.
2. Inclua somente arquivos relacionados à alteração atual; não inclua .env, tokens ou arquivos não relacionados.
3. Se encontrar arquivos não relacionados, pare e liste-os.
4. Faça commit na branch dev com mensagem adequada.
5. Faça push de dev para origin.
6. Atualize main para exatamente o mesmo commit e faça push.
7. No servidor 191.252.226.11, em /opt/airmovebr/repo:
   git fetch origin
   git switch main
   git pull --ff-only origin main
8. Execute as migrações pendentes e o deploy completo dos containers.
9. Valide API, site público, admin e commit em produção.
10. Confirme que produção = origin/main.
11. Volte para a branch dev.
12. Não use git reset --hard nem git clean.
13. Não exponha segredos.
14. Informe commit, branches, deploy, migrações e healthchecks.