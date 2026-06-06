"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shuffleString = void 0;
var shuffleString = function (str) {
    var _a;
    var arr = str.split('');
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        _a = [arr[j], arr[i]], arr[i] = _a[0], arr[j] = _a[1];
    }
    return arr.join('');
};
exports.shuffleString = shuffleString;
//# sourceMappingURL=shuffler.js.map