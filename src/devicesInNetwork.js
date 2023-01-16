const http = require("http");


/**
 * Parses a response XML
 * 
 * @param {string} xml The API response XML
 * @param {function} onCompletion The completion handler
 * @return {boolean} Whether the device is currently connected within the network or not
 */
function apiParse(xml, onCompletion) {
    try {
        // Extract the result
        const regex = /.*<NewActive>(.*)<\/NewActive>.*/g;
        const [match] = [...xml.matchAll(regex)];

        // Parse the result string
        const result = match[1] == "1";
        onCompletion(result);
    } catch (error) {
        // Propagate the error to the completion handler
        onCompletion(null, `${error}\n${xml}`);
    }
}


/**
 * Performs an API request
 * 
 * @param {string} mac The MAC address of the queried device
 * @param {function} onCompletion The completion handler
 */
function apiRequest(mac, onCompletion) {
    // Build the request body
    const requestBody =
        `
        <?xml version="1.0"?>
        <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
        <s:Body>
                <u:GetSpecificHostEntry xmlns:u="urn:dslforum-org:service:Hosts:1">
                <s:NewMACAddress>${mac}</s:NewMACAddress>
                </u:GetSpecificHostEntry>
        </s:Body>
        </s:Envelope>
        `;
    
    // Build the request
    const options = {
        hostname: "fritz.box",
        port: 49000,
        path: "/upnp/control/hosts",
        method: "POST",
        auth: ":",
        headers: {
            "SOAPAction": "urn:dslforum-org:service:Hosts:1#GetSpecificHostEntry",
            "Content-Type": `text/xml; charset="utf-8"`,
            "Content-Length": Buffer.byteLength(requestBody)
        }
    };

    // Configure the request
    const request = http.request(options, result => {
        // Receive response data
        let data = "";
        result.setEncoding("utf8");
        result.on("data", chunk => data += chunk);

        // Parse the result
        result.on("end", () => apiParse(data, onCompletion));
    });
    request.on("error", error => {
        // Propagate the error to the completion handler
        onCompletion(null, error);
    });

    // Start the request
    request.write(requestBody);
    request.end();
}


/**
 * Queries a bunch of devices at once
 * 
 * @param {Array<string>} macs The device's MAC addresses
 * @param {function} onCompletion The completion handler
 */
function queryDevices(macs, onCompletion) {
    // Build the state object
    const state = {
        devices: [],
        remaining: macs.length,
        poisoned: false
    };

    // Populate the state object
    for (const mac of macs) {
        state.devices.push({ mac: mac, status: null })
    }

    // Query all addresses
    for (const device of state.devices) {
        apiRequest(device.mac, (result, error) => {
            // No-op if poisoned
            if (state.poisoned) {
                return;
            }

            // Propagate error and abort if appropriate
            if (error) {
                state.poisoned = true;
                onCompletion(null, error);
                return;
            }

            // Register result
            device.status = result;
            state.remaining -= 1;
            if (state.remaining == 0) {
                // Call completion handler if all devices have been queried
                onCompletion(state.devices);
            }
        });
    }
}


module.exports = function(RED) {
    function init(config) {
        // Create the node
        RED.nodes.createNode(this, config);
        
        // Register the on-"input"-handler
        this.on("input", function(msg, send, done) {
            // Perform the API request
            queryDevices(msg.payload, (result, error) => {
                // Propagate the error to NodeRED
                if (error) {
                    done(error);
                    return;
                }

                // Send the result
                send({ payload: result });
                done();
            });
        });
    }
    RED.nodes.registerType("devices in network", init);
};
