#!/usr/bin/env node
const { Command } = require('commander');
const { coronainit } = require('./command/single');


const program = new Command()
console.log('program');
program
  .command('run [gitUrl]>')
  .description('初始化')
  .action((gitUrl) => {
    console.log('gitUrl', gitUrl);
    coronainit(gitUrl);
  });


program.parse(process.argv)