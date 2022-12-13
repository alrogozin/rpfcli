const config 	= require('config');
const oracledb 	= require('oracledb');
const f 		= require('fs');
const cmn 		= require('./common_tools')

try {
    oracledb.initOracleClient({libDir: config.get('DBConnection.orcl_lib_dir')});
  } catch (err) {
	console.error(`Whoops! ${config.get('DBConnection.orcl_lib_dir')}`);
    console.error(err);
    process.exit(1);
  }
  cmn.do_output(`Ok client version: ` + oracledb.oracleClientVersionString, 'INFO');

async function  oracle_run(msgData) {
	cmn.do_output(msgData.from_name, 'INFO');
	let connection;
  
	try {
	  connection = await oracledb.getConnection( {
		user          : config.get('DBConnection.user'),
		password      : config.get('DBConnection.password'),
		connectString : config.get('DBConnection.connect_string')
	  });
	
	let buff = f.readFileSync(msgData.path_to_file);

	const result = await connection.execute(
		`Begin
			:ret:= post_mail_pkg.save_mail(
												p_msg_from 	=> :mfrom, 
												p_msg_title	=> :mtitle, 
												p_msg_date	=> :mdate, 
												p_rec_type 	=> 'RPFCLI'
											);
		End;
		`,
		{
			mfrom: 	msgData.from_address,
			mtitle: msgData.subject,
			mdate: 	new Date(msgData.msg_date),
		  ret: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER, maxSize: 40 }
		}
	 );

	 const result2 = await connection.execute(
		`Begin
			:ret:= post_mail_pkg.save_attachment(
												p_pmd_id 	=> :pmd_id, 
												p_file_name	=> :mfilename, 
												p_data		=> :mdata 
											);
		End;
		`,
		{
			pmd_id: result.outBinds.ret,
			mfilename: msgData.file_name,
			mdata: buff,
		  ret: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER, maxSize: 40 }
		}
	 );

	connection.commit();

	cmn.do_output(`Oracle data saved, file_name: ${msgData.file_name}`, 'INFO');

	} catch (err) {
		cmn.do_output(err, 'ERROR');
	} finally {
		if (connection) {
			try {
				await connection.close();
			} catch (err) {
				cmn.do_output(err, 'ERROR');
			}
		}
	}
  
}

module.exports.oracle_run = oracle_run;