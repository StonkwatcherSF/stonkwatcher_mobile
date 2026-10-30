import React,{createContext,useContext,useState} from "react";
type Preferences={name:string;username:string;bio:string;notifications:boolean;positions:boolean;rug:boolean;rewards:boolean;announcements:boolean;screenLock:boolean;language:string};
const initial:Preferences={name:"Unipcs",username:"@unipcs",bio:'"If the Lord will, we shall live, and do this, or that." - James 4:15',notifications:true,positions:false,rug:true,rewards:false,announcements:true,screenLock:true,language:"System (English)"};
const C=createContext<{prefs:Preferences;update:(x:Partial<Preferences>)=>void}|null>(null);
export function SettingsProvider({children}:{children:React.ReactNode}){const [prefs,setPrefs]=useState(initial);return <C.Provider value={{prefs,update:x=>setPrefs(p=>({...p,...x}))}}>{children}</C.Provider>}
export function useSettings(){const v=useContext(C);if(!v)throw Error("SettingsProvider missing");return v}
