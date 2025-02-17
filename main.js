import ranges from './ranges.js';
import readline from 'readline';
import chalk from 'chalk';
import CoinKey from 'coinkey';
import walletsArray from './wallets.js';
import fs from 'fs/promises';
import crypto from 'crypto';
import { performance } from 'perf_hooks';

const walletsSet = new Set(walletsArray);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let shouldStop = false;

const bold = chalk.bold.green;
console.clear();
console.log(chalk.red('--------------------'));
console.log(chalk.bold(chalk.green("BTC-PUZZLE V2")));
console.log(bold("by:DiegoDev (Improved by v0)"));
console.log(chalk.red('--------------------'));

async function selectPuzzle() {
    return new Promise((resolve) => {
        rl.question(`${chalk.yellowBright('SELECIONE ')} ${chalk.cyan(1)} - ${chalk.cyan(160)}: `, (answer) => {
            const puzzleNumber = parseInt(answer);
            if (puzzleNumber < 1 || puzzleNumber > 160) {
                console.log(chalk.bgRed('Erro: você precisa escolher um número entre 1 e 160'));
                resolve(null);
            } else {
                resolve(puzzleNumber);
            }
        });
    });
}

async function confirmStart() {
    return new Promise((resolve) => {
        rl.question(`${chalk.yellow('COMEÇAR? Y/N:')}(${chalk.cyan('Y')})`, (answer) => {
            resolve(answer.toLowerCase() === 'y' || answer === '');
        });
    });
}

function getRandomPrivateKey(min, max) {
    const range = max - min;
    const randomBytes = crypto.randomBytes(32);
    const randomValue = BigInt(`0x${randomBytes.toString('hex')}`) % range;
    return min + randomValue;
}

async function encontrarBitcoins(min, max) {
    const startTime = performance.now();
    let keysChecked = 0;
    const updateInterval = 1000; // Update every 1 second
    let lastUpdate = startTime;

    console.log('Buscando Bitcoins...');

    while (!shouldStop) {
        const key = getRandomPrivateKey(min, max);
        const pkey = key.toString(16).padStart(64, '0');
        const formattedPkey = pkey.replace(/^0+/, '');

        keysChecked++;

        const currentTime = performance.now();
        if (currentTime - lastUpdate > updateInterval) {
            const elapsedSeconds = (currentTime - startTime) / 1000;
            const keysPerSecond = keysChecked / elapsedSeconds;
            console.clear();
            console.log('Resumo:');
            console.log('Velocidade:', keysPerSecond.toFixed(2), 'chaves por segundo');
            console.log('Chaves buscadas:', keysChecked.toLocaleString('pt-BR'));
            console.log('Última chave tentada:', formattedPkey);

            await fs.writeFile('Ultima_chave.txt', `Última chave tentada: ${formattedPkey}`);

            lastUpdate = currentTime;
        }

        const publicKey = generatePublic(pkey);
        if (walletsSet.has(publicKey)) {
            const elapsedTime = (performance.now() - startTime) / 1000;
            console.log(chalk.red('******************'));
            console.log('Time:', chalk.yellow(elapsedTime.toFixed(2)), 'seconds');
            console.log('P-Key found:', chalk.yellow(formattedPkey));
            console.log('WIF:', chalk.yellow(generateWIF(pkey)));
            
            await fs.appendFile('keys.txt', `Private key: ${pkey}, WIF: ${generateWIF(pkey)}\n`);
            console.log('chave salva no arquivo:', chalk.yellow('keys.txt'));
            console.log(chalk.red('******************'));

            shouldStop = true;
        }
    }
}

function generatePublic(privateKey) {
    const key = new CoinKey(Buffer.from(privateKey, 'hex'));
    key.compressed = true;
    return key.publicAddress;
}

function generateWIF(privateKey) {
    const key = new CoinKey(Buffer.from(privateKey, 'hex'));
    return key.privateWif;
}

async function main() {
    let puzzleNumber;
    while (!puzzleNumber) {
        puzzleNumber = await selectPuzzle();
    }

    const min = BigInt(ranges[puzzleNumber-1].min);
    const max = BigInt(ranges[puzzleNumber-1].max);
    
    console.log('Puzzle escolhido:', chalk.cyan(puzzleNumber));
    console.log('Chaves possíveis:', chalk.yellow((max - min).toLocaleString('pt-BR')));

    const start = await confirmStart();
    if (start) {
        await encontrarBitcoins(min, max);
    } else {
        console.log(chalk.red('Operação cancelada!'));
    }

    rl.close();
}

process.on('SIGINT', () => {
    shouldStop = true;
    rl.close();
    process.exit();
});

main().catch(console.error);

console.log("Script executado com sucesso. Pressione Ctrl+C para encerrar.");