import { AuthHelper, DataProc, type DbName } from 'epysa-dataproc';


/**
 * Represents the Epysa class.
 * Epysa provides access to various helpers for data processing, and authentication.
 */
export abstract class Epysa {
  public static readonly auth = new AuthHelper( import.meta.env.VITE_DATA_URL, import.meta.env.VITE_DB_NAME as DbName, import.meta.env.VITE_LOGIN_PAGE );
  public static readonly data = new DataProc( import.meta.env.VITE_DATA_URL, import.meta.env.VITE_DB_NAME as DbName );
}

/**
 * Executes a procedure with optional parameters and timeout.
 * @param procedure - The name of the procedure to execute.
 * @param parameters - Optional parameters to pass to the procedure.
 * @param timeout - Optional timeout value in milliseconds.
 * @returns A promise that resolves with the result of the procedure execution.
 * @throws An error if the procedure execution fails.
 */
export const exec = ( procedure : string, parameters? : Record<string, unknown>, timeout?: number  ) => 
    Epysa.data.exec( procedure, parameters, timeout )
      .then( r => {
        if( r.data?.[0]?.Error_msg || r.data?.[0]?.error_msg || r.data?.[0]?.error )
          throw new Error( r.data?.[0]?.Error_msg || r.data?.[0]?.error_msg || r.data?.[0]?.error);
        else  
          return r;
      })


