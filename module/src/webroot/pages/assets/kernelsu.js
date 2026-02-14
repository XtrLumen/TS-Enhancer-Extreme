/**
 * Imported from https://www.npmjs.com/package/kernelsu
 * Modified version by KOWX712
 * Added KernelSU-Next package manager API
 */

let callbackCounter = 0;
function getUniqueCallbackName(prefix) {
    return `${prefix}_callback_${Date.now()}_${callbackCounter++}`;
}

/**
 * Execute shell command with ksu.exec
 * @param {string} command - The command to execute
 * @param {Object} [options={}] - Options object containing:
 *   - cwd <string> - Current working directory of the child process
 *   - env {Object} - Environment key-value pairs
 * @returns {Promise<Object>} Resolves with:
 *   - errno {number} - Exit code of the command
 *   - stdout {string} - Standard output from the command
 *   - stderr {string} - Standard error from the command
 */
export function exec(command, options = {}) {
    return new Promise((resolve, reject) => {
        const callbackFuncName = getUniqueCallbackName("exec");
        window[callbackFuncName] = (errno, stdout, stderr) => {
            resolve({ errno, stdout, stderr });
            cleanup(callbackFuncName);
        };
        function cleanup(successName) {
            delete window[successName];
        }
        try {
            if (typeof ksu !== 'undefined') {
                ksu.exec(command, JSON.stringify(options), callbackFuncName);
            } else {
                resolve({ errno: 1, stdout: "", stderr: "ksu is not defined" });
            }
        } catch (error) {
            reject(error);
            cleanup(callbackFuncName);
        }
    });
}

/**
 * Standard I/O stream for a child process.
 * @class
 */
class Stdio {
    constructor() {
        this.listeners = {};
        }
        this.listeners[event].push(listener);
    }
    emit(event, ...args) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(listener => listener(...args));
        }
    }
}

/**
 * Spawn shell process with ksu.spawn
 * @param {string} command - The command to execute
 * @param {string[]} [args=[]] - Array of arguments to pass to the command
 * @param {Object} [options={}] - Options object containing:
 *   - cwd <string> - Current working directory of the child process
 *   - env {Object} - Environment key-value pairs
 * @returns {Object} A child process object with:
 *   - stdout: Stream for standard output
 *   - stderr: Stream for standard error
 *   - stdin: Stream for standard input
 *   - on(event, listener): Attach event listener ('exit', 'error')
 *   - emit(event, ...args): Emit events internally
 */
export function spawn(command, args = [], options = {}) {
    const child = {
        listeners: {},
        stdout: new Stdio(),
        stderr: new Stdio(),
        stdin: new Stdio(),
        on(event, listener) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(listener);
        },
        emit(event, ...args) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(listener => listener(...args));
            }
        }
    };
    const callbackName = getUniqueCallbackName("spawn");
    window[callbackName] = child;
    child.on("exit", () => delete window[callbackName]);
    try {
        if (typeof ksu !== 'undefined') {
            ksu.spawn(command, JSON.stringify(args), JSON.stringify(options), callbackName);
        } else {
            setTimeout(() => {
                child.stderr.emit("data", "ksu is not defined");
                child.emit("exit", 1);
            }, 0);
        }
    } catch (error) {
        child.emit("error", error);
        delete window[callbackName];
    }
    return child;
}

/**
 * Request the WebView enter/exit full screen.
 * @param {Boolean} isFullScreen - full screen state
 */
export function fullScreen(isFullScreen) {
    if (typeof ksu !== 'undefined') {
        ksu.fullScreen(isFullScreen);
    }
}

/**
 * Show android toast message
 * @param {string} message - The message to display in toast
 * @returns {void}
 */
export function toast(message) {
    if (typeof ksu !== 'undefined') {
        ksu.toast(message);
    } else {
        console.log(message);
    }
}

/**
 * List installed packages
 * @param {string} [type="all"] - The type of packages to list: "user", "system", or "all".
 * @returns {Promise<string[]>} A promise that resolves to an array of package names.
 */
export async function listPackages(type = "all") {
    const pkgTypes = {
        all: () => globalThis.ksu?.listAllPackages(),
        user: () => globalThis.ksu?.listUserPackages(),
        system: () => globalThis.ksu?.listSystemPackages(),
    };

    const pkgType = pkgTypes[type];
    if (typeof pkgType === 'function') {
        try {
            return JSON.parse(pkgType());
        } catch (error) {
            // Fallback to pm list package
        }
    }

    return new Promise((resolve, reject) => {
        const pmArgs = {
            all: [],
            user: ['-3'],
            system: ['-s'],
        };

        if (!(type in pmArgs)) {
            return reject(new Error(`Unknown listPackages type: ${type}`));
        }

        let pkgs = [];
        let stderr = '';

        const pm = spawn('pm', ['list', 'packages', ...pmArgs[type]]);
        pm.stdout.on('data', (data) => {
            if (data.trim() !== '') {
                pkgs.push(data.trim().replace(/^package:/, ''));
            }
        });
        pm.stderr.on('data', (data) => (stderr += data));
        pm.on('exit', (code) => {
            if (code !== 0) {
                return reject(new Error(`pm process exited with code ${code}: ${stderr.trim()}`));
            }
            resolve(pkgs);
        });
        pm.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * @typedef {object} PackagesInfo
 * @property {string} packageName - Package name of the application.
 * @property {string} versionName - Version of the application.
 * @property {number} versionCode - Version code of the application.
 * @property {string} appLabel - Display name of the application.
 * @property {boolean} isSystem - Whether the application is a system app.
 * @property {number} uid - UID of the application.
 */

/**
 * Retrieves detailed information for one or more packages.
 * @param {string|string[]} pkg - A single package name or an array of package names.
 * @returns {Promise<PackagesInfo|PackagesInfo[]>} Resolves with:
 *   - a single package information object if one package is provided
 *   - {}
 *   - an array of package information objects if multiple packages are provided
 *   - [{},{}]
 */
export function getPackagesInfo(pkg) {
    return new Promise((resolve, reject) => {
        if (!pkg) {
            return resolve([]);
        }

        if (typeof globalThis.ksu?.getPackagesInfo !== 'function') {
            return reject(new Error("ksu.getPackagesInfo is not available."));
        }

        const pkgs = Array.isArray(pkg) ? pkg : [pkg];
        if (pkgs.length === 0) {
            return resolve([]);
        }

        try {
            const infoJson = ksu.getPackagesInfo(JSON.stringify(pkgs));
            const result = JSON.parse(infoJson);
            
            if (!Array.isArray(pkg) && result.length === 1) {
                resolve(result[0]);
            } else {
                resolve(result);
            }
        } catch (error) {
            reject(new Error(`Failed to get package info: ${error.message}`));
        }
    });
}

/**
 * @typedef {object} PackagesIcon
 * @property {string} packageName - Package name of the application.
 * @property {string} icon - Ready-to-use base64 image for src.
 */

/**
 * Retrieves base64 icon for one or more packages.
 * @param {string|string[]} pkg - A single package name or an array of package names.
 * @param {number} [size=100] - The dimension of the icon to retrieve.
 * @returns {Promise<PackagesIcon|PackagesIcon[]>} Resolves with:
 *   - a single icon object if one package is provided
 *   - {}
 *   - an array of icon objects if multiple packages are provided
 *   - [{},{}]
 */
export function getPackagesIcon(pkg, size = 100) {
    return new Promise((resolve, reject) => {
        if (!pkg) {
            return resolve([]);
        }

        try {
            const iconJson = ksu.getPackagesIcons(JSON.stringify(pkgs), size);
            const result = JSON.parse(iconJson);
            
            if (!Array.isArray(pkg) && result.length === 1) {
                resolve(result[0]);
            } else {
                resolve(result);
            }
        } catch (error) {
            reject(new Error(`Failed to get package icon: ${error.message}`));
        }
    });
}