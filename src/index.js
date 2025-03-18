#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');
const { glob } = require('glob');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const t = require('@babel/types');
const { Command } = require('commander');

/**
 * 处理单个文件
 * @param {string} filePath - 文件路径
 */
function processFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    let modified = false;
    let hasCoronaImport = false;
    let lastImportIndex = -1;

    // 遍历 AST 查找最后一个 import 语句
    ast.program.body.forEach((node, index) => {
      if (node.type === 'ImportDeclaration') {
        lastImportIndex = index;
        if (node.source.value === '@music/corona-falcon-sdk') {
          hasCoronaImport = true;
        }
      }
    });

    // 处理 catch 块
    traverse(ast, {
      CatchClause(path) {
        const catchParam = path.node.param;
        if (!catchParam || catchParam.type !== 'Identifier') return;

        const errorName = catchParam.name;
        const catchBody = path.node.body.body;

        let hasCoronaLog = false;
        for (const statement of catchBody) {
          if (
            statement.type === 'ExpressionStatement' &&
            statement.expression.type === 'CallExpression') {
            const { callee } = statement.expression;
            if (
              callee.type === 'MemberExpression' &&
              callee.object.type === 'Identifier' &&
              callee.object.name === 'corona' &&
              ['info', 'warn', 'error'].includes(callee.property.name)) {
              hasCoronaLog = true;
              break;
            }
          }
        }

        if (!hasCoronaLog) {
          const logicalOr = t.logicalExpression(
            '||',
            t.identifier(errorName),
            t.objectExpression([])
          );
          const memberExpr = t.memberExpression(logicalOr, t.identifier('stack'));
          const finalExpr = t.logicalExpression(
            '||',
            memberExpr,
            t.identifier(errorName)
          );

          const warnCall = t.callExpression(
            t.memberExpression(t.identifier('corona'), t.identifier('warn')),
            [
              t.stringLiteral('SomethingWrong'),
              t.objectExpression([
                t.objectProperty(t.identifier('error'), finalExpr)]
              ),
              t.stringLiteral('')]
          );

          path.get('body').unshiftContainer('body', t.expressionStatement(warnCall));
          modified = true;
        }
      }
    });

    // 插入 import 语句
    if (modified && !hasCoronaImport) {
      const importStatement = t.importDeclaration(
        [t.importDefaultSpecifier(t.identifier('corona'))],
        t.stringLiteral('@music/corona-falcon-sdk')
      );

      if (lastImportIndex !== -1) {
        // 在最后一个 import 语句之后插入
        ast.program.body.splice(lastImportIndex + 1, 0, importStatement);
      } else {
        // 如果没有 import 语句，插入到文件开头
        ast.program.body.unshift(importStatement);
      }
    }

    // 保存修改
    if (modified) {
      const { code } = generator(ast, { retainLines: false });
      fs.writeFileSync(filePath, code);
      console.log(`Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error}`);
  }
}


/**
 * 检查并安装依赖
 */
function checkAndInstallDependency() {
  try {
    const packageJsonPath = './package.json';
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const hasDependency =
      packageJson.dependencies && packageJson.dependencies['@music/corona-falcon-sdk'] ||
      packageJson.devDependencies && packageJson.devDependencies['@music/corona-falcon-sdk'];

    if (!hasDependency) {
      console.log('@music/corona-falcon-sdk 依赖未找到，正在安装...');
      execSync('npm install @music/corona-falcon-sdk', { stdio: 'inherit' });
      console.log('@music/corona-falcon-sdk 安装完成');
    } else {
      console.log('@music/corona-falcon-sdk 依赖已存在');
    }
  } catch (error) {
    console.error(`检查或安装依赖时出错: ${error}`);
  }
}

/**
 * 处理 Git 操作
 * @param {string} gitUrl - Git 仓库地址
 */
async function handleGitOperations(gitUrl) {
  try {
    console.log('正在克隆仓库...');
    execSync(`git clone ${gitUrl} .`, { stdio: 'inherit' });
    
    console.log('切换到 master 分支...');
    execSync('git checkout master', { stdio: 'inherit' });
    
    console.log('创建并切换到 feature/coronaInit 分支...');
    execSync('git checkout -b feature/coronaInit', { stdio: 'inherit' });
    console.log('推送到远程仓库...');
    execSync('git push origin feature/coronaInit', { stdio: 'inherit' });
  } catch (error) {
    console.error('Git 操作失败:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function coronainit(gitUrl) {
  try {
    console.log('git url: ', gitUrl);
    
    await handleGitOperations(gitUrl);
    
    const files = glob.sync('src/**/*.{js,jsx,ts,tsx}');
    files.forEach(processFile);

    checkAndInstallDependency();
    console.log('处理完成');
  } catch (error) {
    console.error('exception', error);
  }
}
const program = new Command()
console.log('program');
program
  .command('run <gitUrl>')
  .description('初始化')
  .action((gitUrl) => {
    console.log('gitUrl', gitUrl);
    coronainit(gitUrl);
  });


program.parse(process.argv)