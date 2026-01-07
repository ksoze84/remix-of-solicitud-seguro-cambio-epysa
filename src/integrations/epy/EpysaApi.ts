import { AuthHelper, DataProc, type DbName } from 'epysa-dataproc';


/**
 * Represents the Epysa class.
 * Epysa provides access to various helpers for data processing, and authentication.
 */
export abstract class Epysa {
  public static readonly auth = new AuthHelper( import.meta.env.VITE_DATA_URL, import.meta.env.VITE_DB_NAME as DbName, import.meta.env.VITE_LOGIN_PAGE );
  public static readonly data = new DataProc( import.meta.env.VITE_DATA_URL, import.meta.env.VITE_DB_NAME as DbName );
}

