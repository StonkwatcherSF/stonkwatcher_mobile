import React from "react";
import {useRouter} from "expo-router";
import {Page,LinkRow} from "../../../components/SettingsUI";
export default function DepositWithdraw(){const r=useRouter();return <Page title="Deposit and Withdraw"><LinkRow label="Deposit" onPress={()=>r.push("/settings/deposit" as any)}/><LinkRow label="Withdraw" onPress={()=>r.push("/settings/withdraw" as any)}/><LinkRow label="Transfer History" onPress={()=>r.push("/settings/transfer-history" as any)}/></Page>}
