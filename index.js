const config = require('config');
const { Console } = require('console');

var os = require('os');
if (os.platform() == 'win32') {  
    if (os.arch() == 'ia32') {
        var chilkat = require('@chilkat/ck-node16-win-ia32');
    } else {
        var chilkat = require('@chilkat/ck-node16-win64'); 
    }
} else if (os.platform() == 'linux') {
    if (os.arch() == 'arm') {
        var chilkat = require('@chilkat/ck-node11-arm');
    } else if (os.arch() == 'x86') {
        var chilkat = require('@chilkat/ck-node11-linux32');
    } else {
        var chilkat = require('@chilkat/ck-node11-linux64');
    }
} else if (os.platform() == 'darwin') {
    var chilkat = require('@chilkat/ck-node11-macosx');
}

// ----------------------------------------------------
//  Config
const dbConnection = config.get('DBConnection');

const dbConn = {
    iHost: '',
    iUser: '',
    iPort: '',
}

let host = '';

if (config.has('DBConnection.host')) {
   dbConn.iHost = config.get('DBConnection.host');
} else {
   throw new Error('error in config DBConnection.host');
}

console.log(dbConn.iHost);
// ----------------------------------------------------

// ----------------------------------------------------
//  Test pop3
function chilkatExample() {
    var mailman = new chilkat.MailMan();

    mailman.MailHost = "pop.mail.ru";
    mailman.PopUsername = "alkuplenko@mail.ru";
    mailman.PopPassword = "F70X29UAihqs7se6KaEu";
    mailman.PopSsl = true;
    mailman.MailPort = 995;

    // mailman.MailHost = "lssv03.domain.local";
    // mailman.PopUsername = "DOMAIN\ARogozin";
    // mailman.PopPassword = "";
    // mailman.PopSsl = true;
    // mailman.MailPort = 110;

    // Количество писем в
    var numMessages = mailman.GetMailboxCount();
    console.log(`num messages:` + numMessages);

    var bundle = mailman.GetAllHeaders(1)

    if (mailman.LastMethodSuccess !== true) {
        console.log(mailman.LastErrorText);
        return;
    }

    var i = 0;
    var email;
    while (i < bundle.MessageCount - 1) {
        email = bundle.GetEmail(i);
        console.log(i + " From: " + email.From + " Subject: " + email.Subject + " " + email.EmailDateStr);

        // -----------------------------
        // Удаление почтового сообщения
        /*
        if (i == 0) {
            var success = mailman.DeleteEmail(email);
            if (success !== true) {
                console.log(mailman.LastErrorText);
                return;
            }
        }
        */
        // -----------------------------

        i = i+1;
    }
    
    // Make sure the POP3 session is ended to finalize the deletes.
    success = mailman.Pop3EndSession();
    if (success !== true) {
        console.log(mailman.LastErrorText);
    } else {
        console.log(`POP3 connection closed`);
    }

}

chilkatExample();
// ----------------------------------------------------