const config 	= require('config');
const oracledb 	= require('oracledb');
const f 		= require('fs');

try {
    oracledb.initOracleClient({libDir: config.get('DBConnection.orcl_lib_dir')});
  } catch (err) {
    console.error('Whoops!');
    console.error(err);
    process.exit(1);
  }
  console.log(`Ok client version: ` + oracledb.oracleClientVersionString);

async function  oracle_run(msgData) {
	console.log(msgData.from_name);
	let connection;
  
	try {
	  connection = await oracledb.getConnection( {
		user          : config.get('DBConnection.user'),
		password      : config.get('DBConnection.password'),
		connectString : config.get('DBConnection.connect_string')
	  });
	
	  // console.log(connection.oracleServerVersionString);
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

	//  console.log(`pmd_id:${result.outBinds.ret}`);

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
	// console.log(`pmt_attach ${result2.outBinds.ret}`);
	console.log(`Oracle data saved, file_name: ${msgData.file_name}`);

	} catch (err) {
		console.error(err);
	} finally {
		if (connection) {
			try {
				await connection.close();
			} catch (err) {
				console.error(err);
			}
		}
	}
  
}

module.exports.oracle_run = oracle_run;