#!/usr/bin/env bash

cd _site
git init
git remote add origin git@github.com:seanxwzhang/seanxwzhang.github.io.git
git pull origin master
rm -r _includes _plugins _config.yml _layouts _posts projects.md atom.xml about.md projects.md
git add .
git commit

