const deviceInNetwork = require("../src/deviceInNetwork.js");


/**
 * The test case
 */
class TestCase {
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
     * @param {string} mac The MAC address to test
     */
    test(mac, expected) {
        // Mockups the `send` callback
        const send = msg => {
            // Validate the result
            if (msg.payload !== expected) {
                const serialized = JSON.stringify(expected);
                throw `Unexpected result: ${expected} (${serialized})`
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


// Perform the tests
const testCase = new TestCase();
testCase.test("7E:72:FA:51:C2:18", true);  // <- existing MAC addtress
testCase.test("9C:F3:87:C4:79:E0", false); // <- non-existant MAC address
