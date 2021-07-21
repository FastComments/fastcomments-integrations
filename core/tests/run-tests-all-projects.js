const { execSync } = require('child_process');
const config = require('./test-definitions.json');

for (const projectName in config.projects) {
    if (config.projects.hasOwnProperty(projectName)) {
        const start = Date.now();

        console.log(`START ${projectName}`);
        execSync(`node run-tests-single-project.js --library=${projectName}`, {
            stdio: 'inherit'
        });
        console.log(`END ${projectName} ${Date.now() - start}ms`);
    }
}
