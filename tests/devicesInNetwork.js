const deviceInNetwork = require("../src/devicesInNetwork.js");


/**
 * The test bench
 */
class TestBench {
    /**
     * The NodeRED mockups
     */
    nodes;
    /**
     * The initializer
     * 
     * @type {function}
     */
    initializer;
    /**
     * The node input processor
     * 
     * @type {function}
     */
    onInput;

    /**
     * Creates a new test case
     */
    constructor() {
        // Setup the mockup nodes
        this.nodes = {
            createNode: (...args) => this.createNode(...args),
            registerType: (...args) => this.registerType(...args)
        };
        
        // Initialize the node
        deviceInNetwork(this);
        this.initializer();
    }

    /**
     * Tests a MAC address
     * 
     * @param {Array<string>} mac The MAC address to test
     */
    test(mac, expected) {
        // Mockups the `send` callback
        const send = msg => {
            // Validate the result
            const payloadJSON = JSON.stringify(msg.payload);
            const expectedJSON = JSON.stringify(expected);
            if (payloadJSON !== expectedJSON) {
                throw `Unexpected result; expected: ${expectedJSON}, got ${payloadJSON}`
            }
        }

        // Execute the node
        this.onInput({ payload: mac }, send, error => {
            // Rethrow the error
            if (error) {
                throw error;
            }  
        })
    }

    /**
     * A mockup for the `on`-event registry
     * 
     * @param {string} name The event name
     * @param {function} func The function
     */
    on(name, func) {
        // Register the input handler
        if (name == "input") {
            this.onInput = func;
        }
    }
    /**
     * A mockup for NodeRED's `createNode`
     */
    createNode() {
        // No-op
    }
    /**
     * A mockup for NodeRED's `registerType`
     * 
     * @param {string} name The function alias
     * @param {function} func The function to register
     */
    registerType(_name, func) {
        this.initializer = func;
    }
}

/**
 * Performs the tests
 */
exports.test = function() {
    // Initialize test bench
    const testBench = new TestBench();

    // Query devices
    const addresses = [
        "7E:72:FA:51:C2:18", // <- present MAC addtress
        "9C:F3:87:C4:79:E0"  // <- absent MAC address
    ];
    const expected = [
        { mac: "7E:72:FA:51:C2:18", status: true },
        { mac: "9C:F3:87:C4:79:E0", status: false }
    ]
    testBench.test(addresses, expected);
}
