var CRMHelper = (function (helper) {
    function getReqErrorLog(req) {
        var errorObj = JSON.parse(req.responseText);

        errorLog = 'Response URL: ' + req.responseURL;
        errorLog += '\nStatus Text: ' + req.statusText;
        errorLog += '\nStatus: ' + req.status;

        errorLog += '\nError Message: ' + errorObj.error.message;
        try { errorLog += '\nInner Error: ' + errorObj.error.innererror.message; } catch (ex) { }

        return errorLog;
    }

    function getPlainErrorMessage(req) {
        var errorObj = JSON.parse(req.responseText);

        return errorObj.error.message;
    }

    function writeErrorOnConsole(title, description, req) {
        var logDivisor = '##########';
        var titleDivisor = '_____________';
        description = !description && req ? getReqErrorLog(req) : description;

        console.log(logDivisor);
        console.log(title);
        console.log(titleDivisor);
        console.log(description);
        console.log(logDivisor);
    }

    helper.Error = {
        GetReqErrorLog: getReqErrorLog,
        GetPlainErrorMessage: getPlainErrorMessage,
        WriteErrorOnConsole: writeErrorOnConsole
    };
    return helper;

}(CRMHelper || {}));