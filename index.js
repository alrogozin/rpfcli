// const uid = require('uid');
const fs = require('fs');
const config = require('config');
const f = require('./manage_fs')

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

// console.log(uid.uid());

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
// console.log(dbConn.iHost);

// ----------------------------------------------------
// Удаление "старых" (> 10 дней) каталогов с содержимым
var list = fs.readdirSync(dirPath);
let ddate, sysdate = new Date();
for(var i = 0; i < list.length; i++) {
    ddate = f.get_dir_date(dirPath+`/`+list[i]);
    if (f.Get_DaysDiff(ddate, sysdate) > 0 ) {
        f.Remove_Dir(dirPath+`/`+list[i]);
    };
}

// ----------------------------------------------------
//  Test pop3
function doPOP3Mail() {
    let sa2Mng = [];
    var mailman = new chilkat.MailMan();

    mailman.MailHost = "pop.mail.ru";
    mailman.PopUsername = "alkuplenko@mail.ru";
    mailman.PopPassword = "";
    mailman.PopSsl = true;
    mailman.MailPort = 995;

    // Количество писем в ящике
    var numMessages = mailman.GetMailboxCount();

    if (numMessages > 0) {
        var bundle = mailman.CopyMail();
        if (mailman.LastMethodSuccess !== true) {
            console.log(mailman.LastErrorText);
            return;
        }

        // Получение UIDls
        var saUidls = mailman.GetUidls(); // saUidls.GetString(0)
        if (mailman.LastMethodSuccess !== true) {
            console.log('~~~' + mailman.LastErrorText);
            return;
        }

        // Declarations
        var i = 0;
        var email;
        var mDir = "";
        
        // Цикл по всем сообщениям
        while (i < bundle.MessageCount) {
            email = bundle.GetEmail(i);
            console.log(i + " From: " + email.FromAddress + " Subject: " + email.Subject + " " + email.EmailDateStr+ " "+email.NumAttachments);
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
                        console.log(email.LastErrorText);
                        return;
                    }
                    // Запись в массив для дальнейшей обработки
                    sa2Mng.push(mDir + `/` + email.GetAttachmentFilename(0));
                }
                // -----------------------------
                // Удаление почтового сообщения
                // if (i == 0) {
                    var success = mailman.DeleteEmail(email);
                    if (success !== true) {
                        console.log(mailman.LastErrorText);
                        return;
                    }
                // }
            }
            
            // -----------------------------

            i = i+1; // счетчик UP

        }

        // Make sure the POP3 session is ended to finalize the deletes.
    }
    success = mailman.Pop3EndSession();
    if (success !== true) {
        console.log(mailman.LastErrorText);
    } else {
        console.log(`POP3 connection closed`);
    }

}


// var i = 1;

function EndessLoop() {
  setTimeout(function() {
    console.log('Starting');
    doPOP3Mail();
    //  i++;
    //  if (i < 4) {
        EndessLoop();
    //  }
  }, 3000)
}

EndessLoop();  


// Какие файлы нужно обработать:
// F70X29UAihqs7se6KaEu
// sa2Mng.forEach(element => console.log(element));

// ----------------------------------------------------