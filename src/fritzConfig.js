module.exports = function(RED) {
    function fritzBox(config) {
        RED.nodes.createNode(this, config);
        this.username = config.username;
        this.password = config.password;
    }
    RED.nodes.registerType("fritz-box", fritzBox);
}
