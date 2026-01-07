import { type IdatoEpysa } from "epysa-dataproc";
import { exec } from "./EpysaApi";
import { type ChangeEvent } from "react";
import { keep } from "use-keep";

export class EpyRecord {
  public data = keep<IdatoEpysa | undefined>(undefined);
  public isLoading = keep(false);
  protected loadUri : string = '';
  protected saveUri : string = '';

  constructor( loadUri : string, saveUri? : string ) {
    this.loadUri = loadUri;
    this.saveUri = saveUri ?? '';
  }

  public clear = () => {
    this.isLoading(false);
    this.data(undefined);
  }

  public load = ( params? : Record<string, any> ) => {
    this.isLoading(true);
    return exec( this.loadUri, params )
      .then( resp => { this.data(resp?.data?.[0]); return resp } )
      .finally( () => this.isLoading(false) )
  }

  public modify = ( changes : Partial<IdatoEpysa> ) => 
    this.data({ ...this.data(), ...changes })

  public formModify = ( e: ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement> ) => 
    this.data({ ...this.data(), [e.target.name] : e.target.value })

  public save = ( mergeParams? : Record<string, any>, overwrite? : boolean ) => {
    let saveData : Record<string, any> = { ...this.data() as Record<string, any> };

    if( overwrite && mergeParams )
      saveData = mergeParams;
    else if ( mergeParams )
      saveData = { ...saveData, ...mergeParams };

    this.isLoading(true);
    return exec( this.saveUri, saveData )
      .finally( () => this.isLoading(false) );
  } 

}


