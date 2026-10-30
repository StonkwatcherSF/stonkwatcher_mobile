import React,{useState} from "react";
import {Pressable,Text,Alert} from "react-native";
import {Page,lime} from "../../../components/SettingsUI";
import {useSettings} from "../../../components/SettingsContext";
const languages=["System (English)","English","Deutsch","Español","Français","中文"];
export default function Language(){const {prefs,update}=useSettings();const [value,setValue]=useState(prefs.language);return <Page title="Language" action="Save Changes" onAction={()=>{update({language:value});Alert.alert("Saved","Language preference saved for this session. Full translation is not enabled yet.")}}>{languages.map(l=><Pressable key={l} onPress={()=>setValue(l)} style={{height:54,flexDirection:"row",alignItems:"center",justifyContent:"space-between"}}><Text style={{color:"white",fontSize:16}}>{l}</Text>{value===l&&<Text style={{color:lime,fontSize:22}}>●</Text>}</Pressable>)}</Page>}
