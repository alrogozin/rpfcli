// const uid = require('uid');
const fs = require('fs');
const config = require('config');
const f = require('./manage_fs')
const o = require('./manage_oracle')
const cmn = require('./common_tools')

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
var dirPath = "attachments";
const numDaysGap2DelLoadedFiles = config.get('numDaysGap2DelLoadedFiles');

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

// ----------------------------------------------------
class msgData {
	id;
	msg_date;
	from_address;
	from_name;
	subject;
    path_to_file;
    file_name;
	constructor(id, msg_date, from_address,from_name, subject, file_name, path_to_file) {
		this.id 			= id;
		this.msg_date 		= msg_date;
		this.from_address 	= from_address;
		this.from_name 		= from_name;
		this.subject 		= subject;
        this.file_name      = file_name;
        this.path_to_file   = path_to_file;
	}
}


// ----------------------------------------------------
//  Test pop3
function doPOP3Mail() {

    // ----------------------------------------------------
    // Удаление "старых" (> numDaysGap2DelLoadedFiles дней) каталогов с содержимым
    var list = fs.readdirSync(dirPath);
    let ddate, sysdate = new Date();
    for(var i = 0; i < list.length; i++) {
        ddate = f.get_dir_date(dirPath+`/`+list[i]);
        if (f.Get_DaysDiff(ddate, sysdate) > numDaysGap2DelLoadedFiles ) {
            f.Remove_Dir(dirPath+`/`+list[i]);
        };
    }

    let message2manage = [];
    var mailman = new chilkat.MailMan();

    // mailman.MailHost = "pop.mail.ru";
    // mailman.PopUsername = "alkuplenko@mail.ru";
    // mailman.PopPassword = "F70X29UAihqs7se6KaEu"
    // mailman.PopSsl = true;
    // mailman.MailPort = 995;

    mailman.MailHost = "172.16.2.139";
    mailman.PopUsername = "akt_mvs";
    mailman.PopPassword = "!YkP186L"
    mailman.PopSsl = false;
    mailman.MailPort = 110;

    // Количество писем в ящике
    var numMessages = mailman.GetMailboxCount();
    
    cmn.do_output(`Messages: ${numMessages}`, 'INFO');
    
    if (mailman.LastMethodSuccess !== true) {
        cmn.do_output(mailman.LastErrorText, 'ERROR');
        return;
    }

    if (numMessages == -1) {
        cmn.do_output("Connection doesn't established", 'ERROR');
        // throw new Error("Connection doesn't established");
    } 
    else if (numMessages > 0) {
        cmn.do_output(`Connection to POP3 server established`); 
        var bundle = mailman.CopyMail();
        if (mailman.LastMethodSuccess !== true) {
            cmn.do_output(mailman.LastErrorText, 'ERROR');
            return;
        }

        // Получение UIDls
        var saUidls = mailman.GetUidls(); // saUidls.GetString(0)
        if (mailman.LastMethodSuccess !== true) {
            cmn.do_output('~~~' + mailman.LastErrorText, 'ERROR');
            return;
        }

        // Declarations
        var i = 0;
        var email;
        var mDir = "";
        
        // Цикл по всем сообщениям
        while (i < bundle.MessageCount) {
            email = bundle.GetEmail(i);
            // Если есть attachment:
            if (email.NumAttachments > 0) {
                // Создается каталог с именем UIDls (если такого каталога еще нет)
                try{
                    mDir = dirPath+`/`+saUidls.GetString(i);
                    fs.mkdirSync(mDir);
                    } catch (err) {
                        if (err.code !== 'EEXIST') {
                            throw err;
                        }            
                    }

                // Сохраняю файл в каталог, если файла еще нет
                if (!fs.existsSync(mDir + `/` + email.GetAttachmentFilename(0))) {
                    success = email.SaveAllAttachments(mDir);
                    if (success !== true) {
                        cmn.do_output(email.LastErrorText, 'ERROR');
                        return;
                    }
                    // Запись в массив для дальнейшей обработки
                    // mDir + `/` + email.GetAttachmentFilename(0)
                    let m = new msgData(
                        email.Uidl,
                        email.EmailDateStr, 
                        email.FromAddress, 
                        email.FromName, 
                        email.Subject,
                        email.GetAttachmentFilename(0),
                        mDir + `/` + email.GetAttachmentFilename(0)
                        );
                    message2manage.push(m);
                    o.oracle_run(m);
                }
            }
            
            // -----------------------------
            // Удаление почтового сообщения
            // if (i == 0) {
                var success = mailman.DeleteEmail(email);
                if (success !== true) {
                    cmn.do_output(mailman.LastErrorText, 'ERROR');
                    return;
                }
            // }

            i = i+1; // счетчик UP

        }
    }

    // End the POP3 session and close the connection to the POP3 server.
    success = mailman.Pop3EndSession();
    if (success !== true) {
        cmn.do_output(mailman.LastErrorText, 'ERROR');
    } else {
        cmn.do_output(`POP3 connection closed`, 'INFO');
    }


}


// =========================================
function EndessLoop() {
    let timeOut = config.get('timeOut');
    setTimeout(function() {
        cmn.do_output(`Starting: ${Date().toLocaleString()}  interval: ${timeOut}`, 'INFO');
        doPOP3Mail();
        EndessLoop();
    }, timeOut)
}

EndessLoop();  
// =========================================
// doPOP3Mail();

// =========================================

// Какие файлы нужно обработать:
// F70X29UAihqs7se6KaEu

// ----------------------------------------------------