import { type IdatoEpysa } from "epysa-dataproc";
import { exec } from "./EpysaApi";
import { type ChangeEvent } from "react";
import { keep } from "use-keep";


export class EpyData<T = IdatoEpysa> {
  public data = keep<T[]|undefined>(undefined);
  public isLoading = keep(false);

  protected loadUri : string = '';
  protected saveUri : string = '';

  constructor(loadUri : string, saveUri? : string) {
    this.loadUri = loadUri;
    this.saveUri = saveUri ?? '';
  }


  modify = ( elemento : T, changes : Partial<T> ) => 
    this.data(this.data()?.map( e => e === elemento ? { ...e, ...changes } : e ))

  formModify = ( elemento : T, e: ChangeEvent<HTMLInputElement|HTMLSelectElement> ) =>  
    this.data(this.data()?.map( d => d === elemento ? { ...d, [e.target.name]: e.target.value } : d ))

  deleteItem = ( elemento : T ) => 
    this.data(this.data()?.filter( e => e !== elemento ))

  append = ( elemento : T ) =>
    this.data([...(this.data() ?? []), elemento])

  prepend = ( elemento : T ) =>
    this.data([ elemento, ...(this.data() ?? []) ])

  clear = () => {
    this.isLoading(false);
    this.data([]);
  }
  
  load = ( params? : Record<string, unknown> ) => {
    this.isLoading(true); 
    return exec( this.loadUri, params )
            .then( resp => { this.data((resp?.data ?? []) as T[]); return resp } )
            .finally( () => this.isLoading(false) )
  }

  save = ( mergeParams? : Record<string, unknown>, overwrite? : boolean ) => {
    let saveData : Record<string, unknown> = { data : this.data() };
  
    if( overwrite && mergeParams )
      saveData = mergeParams;
    else if ( mergeParams )
      saveData = { ...saveData, ...mergeParams };
  
    this.isLoading(true);
    return exec( this.saveUri ?? '', saveData )
      .finally( () => this.isLoading(false) );
  }
  
}