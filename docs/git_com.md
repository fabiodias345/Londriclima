Faça o commit das alterações atuais com uma mensagem adequada.

Depois:

1. Sincronize dev com o último commit.
2. Atualize main com esse mesmo commit.
3. Faça push de dev e main para o remoto.
4. Garanta que a produção use sempre o último commit da main.
5. No servidor, faça git fetch, git switch main e git pull --ff-only origin main.
6. Execute o deploy completo dos containers.
7. Valide o healthcheck da API e o site público.
8. Confirme que a produção está no mesmo commit da main.
9. Ao final, volte para a branch dev.
10. Não use git reset --hard nem git clean.
11. Não inclua arquivos não relacionados sem minha autorização.
12. Informe commit, branches, status do deploy e healthcheck.