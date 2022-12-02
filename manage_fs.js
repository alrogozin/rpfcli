const fs = require('fs');
const path = require('path');

function get_dir_date(p_dir_path) {
    let fstat = fs.statSync(p_dir_path);
// console.log( '{"createtime":"' + stat.birthtime.toISOString().replace(/[:\.T]/g,"-").replace(/[^0-9\-]*/g,"") +'","filename":"' + p_dir_path + '"}' );
    return fstat.birthtime;
}

function Get_DaysDiff(p_date_beg, p_date_end) {
    return Math.ceil((p_date_end-p_date_beg) / (1000 * 60 * 60 * 24))
}

var Remove_Dir = function(dir) {
    var list = fs.readdirSync(dir);
    for(var i = 0; i < list.length; i++) {
        var filename = path.join(dir, list[i]);
        var stat = fs.statSync(filename);

        if(filename == "." || filename == "..") {
            // pass these files
        } else if(stat.isDirectory()) {
            // Remove_Dir recursively
            Remove_Dir(filename);
        } else {
            // rm fiilename
            fs.unlinkSync(filename);
        }
    }
    fs.rmdirSync(dir);
};

// if (fs.existsSync(`D:/progs/nodejs/rpfcli/attachments/bin`)) {
//     Remove_Dir(`D:/progs/nodejs/rpfcli/attachments/bin`);
// }

module.exports.get_dir_date = get_dir_date;
module.exports.Get_DaysDiff = Get_DaysDiff;
module.exports.Remove_Dir = Remove_Dir;