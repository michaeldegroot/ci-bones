var inquirer = require("inquirer")
var fs = require('fs')
var async = require('async')
var mkdirp = require('mkdirp')
var jsonfile = require('jsonfile')
var argv = require('minimist')(process.argv.slice(2))
require('shelljs/global')

var ui = new inquirer.ui.BottomBar()

var packaged = "unknown"
var packageJson = "unknown"
var gitRepo = "unknown"
if(fs.existsSync("package.json")){
  packaged = jsonfile.readFileSync('package.json')
  fs.readFile("package.json", function (err, data) {
    packageJson = data;
  })
}

var packageName = "unknown"
var packageDesc = "unknown"
var appFile = "unknown"
var foundRedis = false
var overwriteTravis = false


if(argv.v){
  console.log("Version 0.1.1")
  process.exit(0)
}
if(argv.help){
  console.log("KAPPA")
  process.exit(0)
}

ui.log.write("Welcome to ci-bones. Lets get started!")

if (!which('npm')) {
  echo('ci-bones requires npm to be installed')
  exit(1)
}

function exitIfFailure(code,output){
  if(code==1){
    console.error(output)
    process.exit(1)
  }
}
setTimeout(function(){
  async.series([
      function(callback){
        if (!which('mocha')) {
          ui.log.write("Installing mocha.....")
          exec('npm install mocha -g', function(code, output) {
            exitIfFailure(code,output)
            setTimeout(callback,100)
          })
        }else{
          setTimeout(callback,100)
        }
      },
      function(callback){
        if (!which('istanbul')) {
          ui.log.write("Installing istanbul.....")
          exec('npm install istanbul -g', function(code, output) {
            exitIfFailure(code,output)
            setTimeout(callback,100)
          })
        }else{
          setTimeout(callback,100)
        }
      },
      function(callback){
        if (!which('coveralls')) {
          ui.log.write("Installing coveralls.....")
          exec('npm install coveralls -g', function(code, output) {
            exitIfFailure(code,output)
            setTimeout(callback,100)
          })
        }else{
          setTimeout(callback,100)
        }
      },
      function(callback){
        if(packaged){
          prompt("Your package name is '"+packaged.name+"' is this correct","confirm",true,function(a){
            if(a){
              packageName = packaged.name
              if(packaged.description) packageDesc = packaged.description
              if(packaged.main) appFile = packaged.main
            }
            setTimeout(callback,100)
          });
        }else{
          echo('ci-bones requires a existing package.json. Please run "npm init"')
          exit(1)
        }
      },
      function(callback){
        if(!packaged.repository){
          setTimeout(callback,100)
          return
        }
        if(fs.existsSync(".git")){
          setTimeout(callback,100)
        }else{
          prompt("Do you want to setup a git repository","confirm",true,function(a){
            if(a){
              ui.log.write("Example: https://github.com/michaeldegroot/testrepo.git")
              inquirer.prompt([{
                type: "input",
                name: "a",
                message: "What's your git HTTPS or GIT repository URL ?"
              }], function( answers ) {
                gitRepo = answers.a
                exec('git init', function(code, output) {
                  exitIfFailure(code,output)
                  exec('git remote add origin '+gitRepo, function(code, output){
                    setTimeout(callback,100)
                  })
                })
              })
            }
          })
        }
      },
      function(callback){
        if(packageName=="unknown"){
          inquirer.prompt([{
            type: "input",
            name: "a",
            message: "What's the name of your package ?"
          }], function( answers ) {
            packageName = answers.a
            setTimeout(callback,100)
          })
        }else{
          setTimeout(callback,100)
        }
      },
      function(callback){
        if(packageJson.indexOf('redis') >= 1){
          ui.log.write("Redis found in package.json")
          foundRedis = true
        }
        setTimeout(callback,100)
      },
      function(callback){
        if(fs.existsSync(".travis.yml")){
          prompt("Found existing .travis.yml. Do you want to overwrite","confirm",false,function(a){
            overwriteTravis = a
            if(a){
                fs.unlinkSync('.travis.yml')
                setTimeout(callback,100)
            }else{
              setTimeout(callback,100)
            }
          })
        }else{
          overwriteTravis = true
          setTimeout(callback,100)
        }
      },
      function(callback){
        if(!overwriteTravis){
           setTimeout(callback,100)
           return
        }
        var s = fs.createWriteStream('.travis.yml', {'flags': 'a'})
        s.write('language: node_js\r\n')
        if(foundRedis){
          s.write('services:\r\n')
          s.write('  - redis-server\r\n')
        }
        s.write('node_js:\r\n')
        s.write('  - "5.0"\r\n')
        s.write('  - "4.1"\r\n')
        s.write('  - "4.0"\r\n')
        s.write('  - "0.12"\r\n')
        s.write('  - "0.11"\r\n')
        s.write('  - "0.10"\r\n')
        s.end('after_script: NODE_ENV=test istanbul cover ./node_modules/mocha/bin/_mocha -- -R spec ./test/* && node node_modules/coveralls/bin/coveralls.js < coverage/lcov.info\r\n')
        setTimeout(callback,100)
      },
      function(callback){
        if(fs.existsSync(".coveralls.yml")){
          prompt("Found existing .coveralls.yml. Do you want to overwrite","confirm",false,function(a){
            if(a){
                fs.unlinkSync('.coveralls.yml')
                tokenPrompt(callback)
            }else{
              setTimeout(callback,100)
            }
          })
        }else{
          tokenPrompt(callback)
        }
      },
      function(callback){
        if(!fs.existsSync("test")){
          ui.log.write("Creating mocha test suite folder.....")
          mkdirp('test', function(err) { 
            if(err) throw new Error(err)
            var s = fs.createWriteStream('test/test.js', {'flags': 'a'})
            s.write("var assert = require('assert');\r\n")
            s.write("var assert = require('assert-plus');\r\n")
            s.write("var myApp = require('../"+appFile+"');\r\n")
            s.write("\r\n")
            s.write("describe('test', function() {\r\n")
            s.write(" it('tests', function() {\r\n")
            s.write("   assert.equal(1,1);\r\n")
            s.write(" });\r\n")
            s.end("});\r\n")
          setTimeout(callback,100)
          })
        }else{
          ui.log.write("Test folder already exists. Skipping.")
          setTimeout(callback,100)
        }
      },
      function(callback){
        if (!packaged.scripts) packaged.scripts = {}
        packaged.scripts["test"] = "mocha"
        packaged.scripts["cover"] = "istanbul cover ./node_modules/mocha/bin/_mocha -- -R spec ./test/*"
        packaged.scripts["coveralls"] = "npm bin /istanbul cover ./node_modules/mocha/bin/_mocha -- -R spec ./test/* && node node_modules/coveralls/bin/coveralls.js < coverage/lcov.info"
        jsonfile.writeFileSync('package.json', packaged, {spaces: 2})
        setTimeout(callback,100)
      },
      function(callback){
        if(!fs.existsSync("README.md")){
          ui.log.write("Creating README.md.....")
          var s = fs.createWriteStream('README.md', {'flags': 'a'})
          if(packageDesc=="unknown") s.end("## "+packageName+"\r\n")
          if(packageDesc!="unknown"){
            s.write("## "+packageName+"\r\n");
            s.write("\r\n");
            s.end(packageDesc+"\r\n");
          }
          setTimeout(callback,100)
        }else{
          ui.log.write("README.md already exists. Skipping.")
          setTimeout(callback,100)
        }
      },
      function(callback){
        var calledCb = false
        installApps = ['assert','assert-plus','coveralls','istanbul','mocha','mocha-lcov-reporter']
        for(i=0;i<installApps.length;i++){
          if(packageJson.indexOf('"'+installApps[i]+'":') <= 0){
            ui.log.write("Installing "+installApps[i]+"....")
            exec('npm install '+installApps[i]+' --save-dev', function(code, output) {
              exitIfFailure(code,output)
              if(installApps.length==i && calledCb == false){
                 setTimeout(callback,100)
                 calledCb = true
              }
            })
          }
        }
      },
      function(callback){
        fs.readFile(".gitignore", function (err, data) {
          var s = fs.createWriteStream('.gitignore', {'flags': 'a'})
          if(!err){
            if(data.indexOf('coveralls') <= 0) s.write(".coveralls.yml\r\n")
            if(data.indexOf('node_modules') <= 0) s.write("node_modules\r\n")
          }else{
            s.write(".coveralls.yml\r\n")
            s.write("node_modules\r\n")
          }
          s.end()
          setTimeout(callback,3000)
        })
      },
      function(callback){
        ui.log.write("")
        ui.log.write("------------------------")
        ui.log.write("ci-bones is done!")
        ui.log.write("")
        ui.log.write("")
        ui.log.write("You can begin with your CI adventures:")
        ui.log.write("  npm test                 - starts mocha tests")
        ui.log.write("  npm run-script cover     - produces a report in the 'coverage' folder")
        ui.log.write("  npm run-script coveralls - sends coverage data to coveralls.io")
        ui.log.write("")
        ui.log.write("")
        ui.log.write("")
        ui.log.write("And whenever you push your repository, coveralls.io will be automatically updated with the new coverage and travis CI will check if your build passes")
        ui.log.write("")
        ui.log.write("Dont forget to initialize coveralls.io and travis ci via the websites itself.")
        ui.log.write("Happy coding :)")
      }
    ])
},300)

function tokenPrompt(callback){
  inquirer.prompt([{
      type: "input",
      name: "a",
      message: "What's your coveralls.io repo token ?"
    }], function( answers ) {
      var s = fs.createWriteStream('.coveralls.yml', {'flags': 'a'})
      s.write('repo_token: ')
      s.end(answers.a)
      callback()
  })
}


function prompt(question,type,def,cb){
  inquirer.prompt([{
      type: type,
      name: "a",
      message: question+" ?",
      default: def
    }], function( answers ) {
      setTimeout(cb,100,answers.a)
  })
}

