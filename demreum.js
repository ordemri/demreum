/**
 * Created by ord on 4/24/2016.
 */

var web3;

function setWeb3(web3Object) {
    if (web3Object && web3Object.isConnected()) {
        web3 = web3Object;
        return {connected: 'true'}

    } else {
        return {error: 'web3'}
    }
}

function compile(contractTxt, cb) {
    var data = contractTxt.replace(/(\r\n|\n|\r)/gm, "");
    cb = cb || function (a) {
        };

    var contract = {};
    try {
        var compiled = web3.eth.compile.solidity(data);
    } catch (err) {
        contract.success = false;
        contract.message = err.message;
    }
    if (compiled) {
        if (!compiled.message) {
            contract.success = true;
            contract.name = Object.keys(compiled)[0];
            contract.code = compiled[contract.name].code;
            contract.abi = compiled[contract.name].info.abiDefinition;
        } else {
            contract.success = false;
            contract.message = compiled.message;
        }
    }
    if (cb) {
        cb(contract);
    }
}

function deploy(compiled, contractText, cb) {
    cb = cb || function (a) {
        };
    if (!compiled && contractText) {
        compile(contractText, function (r) {
            if (r.success) {
                compiled = r;
            }
        })
    }
    if (!compiled) {
        throw 'empty contract data.';
    }
    var cache = {event: [], function: []};

    for (var i = 0; i < compiled.abi.length; i++) {
        var func = compiled.abi[i];
        if (func.type == 'function' || func.type == 'event') {
            var params = [];
            if (func.inputs != undefined) {
                for (var j = 0; j < func.inputs.length; j++) {
                    var name = func.inputs[j].name;
                    name != "" ? name : "a" + j
                    params.push(name);
                }
            }
            cache[func.type].push({name: func.name, constant: func.constant, params: params});
        }
    }


    web3.eth.contract(compiled.abi).new({
        from: web3.eth.accounts[0],
        data: compiled.code,
        gas: 3000000
    }, function (err, contInstance) {
        if (err) {

            cb(err, null);
        } else if (contInstance.address) {
            console.log(contInstance)
            cache['function'].forEach(function (key){

                contInstance['execute_'+key.name] = function (callback,parameters){
                    callback = callback || function (a) {
                            console.log(a);
                        };
                    parameters = parameters || [];

                    if(parameters.length != key.params.length ){
                        throw  parameters.length+' params received instead ' +key.params.length;
                    } else {
                        if (!key.constant) {
                            parameters.push({from: web3.eth.accounts[0], gas: 3000000});
                        }
                        parameters.push(callback);
                        contInstance[key.name](...parameters);


                    }
                }

            });
            cb(null,contInstance);
        }
    });


}


exports.compile = compile;
exports.setWeb3 = setWeb3;
exports.deploy = deploy;
