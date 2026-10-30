import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
export const lime = "#C5E600";
export function Page({ title, children, action, onAction, scroll = false }: {title:string;children:React.ReactNode;action?:string;onAction?:()=>void;scroll?:boolean}) {
 const router=useRouter();
 return <View style={st.root}><View style={st.head}><Pressable style={st.back} onPress={()=>router.back()}><ChevronLeft size={23} color="#ddd"/></Pressable><Text style={st.title}>{title}</Text></View>{scroll?<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={st.body}>{children}</ScrollView>:<View style={st.body}>{children}</View>}{action&&<Pressable style={st.button} onPress={onAction}><Text style={st.buttonText}>{action}</Text></Pressable>}</View>
}
export function LinkRow({label,onPress}: {label:string;onPress:()=>void}) {return <Pressable style={st.link} onPress={onPress}><Text style={st.linkText}>{label}</Text><ChevronRight color="#aaa" size={19}/></Pressable>}
export const st=StyleSheet.create({root:{flex:1,backgroundColor:"#10110B",paddingHorizontal:20,paddingTop:55},head:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:30},back:{width:39,height:39,borderRadius:20,backgroundColor:"#282A28",alignItems:"center",justifyContent:"center"},title:{fontSize:25,color:"white",fontWeight:"700",flexShrink:1},body:{flex:1},button:{height:48,borderRadius:5,backgroundColor:lime,alignItems:"center",justifyContent:"center",marginBottom:30},buttonText:{fontWeight:"700",fontSize:16,color:"#101010"},link:{height:53,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},linkText:{fontSize:16,color:"#fff"},label:{color:"white",fontSize:14,marginBottom:10},input:{backgroundColor:"#20221E",borderWidth:1,borderColor:"#444",color:"white",borderRadius:5,paddingHorizontal:14,minHeight:43,marginBottom:20},muted:{color:"#aaa",fontSize:12},card:{backgroundColor:"#171813",borderRadius:8,padding:14,marginBottom:12}});
