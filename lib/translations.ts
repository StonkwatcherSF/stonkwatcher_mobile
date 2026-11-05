export type AppLocale = "en" | "de" | "es" | "fr" | "zh";
export const LANGUAGE_OPTIONS = ["System (English)", "English", "Deutsch", "Español", "Français", "中文"] as const;
export const LOCALE_NAMES: Record<string, AppLocale> = { English: "en", Deutsch: "de", Español: "es", Français: "fr", 中文: "zh" };
export function resolveLocale(preference: string, deviceLocale: string): AppLocale {
  if (LOCALE_NAMES[preference]) return LOCALE_NAMES[preference];
  const language = deviceLocale.split(/[-_]/)[0].toLowerCase();
  return ["de", "es", "fr", "zh"].includes(language) ? language as AppLocale : "en";
}
// English keys stay readable in the UI code. Names, symbols, addresses and user content are never keys.
const rows = `
Official token|Offizieller Token|Token oficial|Jeton officiel|官方代币
Official coins cannot be blacklisted.|Offizielle Token können nicht gesperrt werden.|Los tokens oficiales no pueden incluirse en la lista de bloqueo.|Les jetons officiels ne peuvent pas être ajoutés à la liste de blocage.|官方代币不能加入黑名单。
Update required|Update erforderlich|Actualización obligatoria|Mise à jour obligatoire|需要更新
Updating StonkWatcher. The app will restart automatically.|StonkWatcher wird aktualisiert. Die App startet automatisch neu.|Actualizando StonkWatcher. La aplicación se reiniciará automáticamente.|Mise à jour de StonkWatcher. L’application redémarrera automatiquement.|正在更新 StonkWatcher，应用将自动重启。
The update could not be downloaded. Check your connection and retry.|Das Update konnte nicht heruntergeladen werden. Prüfe deine Verbindung und versuche es erneut.|No se pudo descargar la actualización. Comprueba tu conexión y vuelve a intentarlo.|Impossible de télécharger la mise à jour. Vérifiez votre connexion et réessayez.|无法下载更新，请检查网络连接后重试。
Retry|Erneut versuchen|Reintentar|Réessayer|重试
Permission required|Berechtigung erforderlich|Permiso requerido|Autorisation requise|需要权限
Allow photo access to update your profile image.|Erlaube den Fotozugriff, um dein Profilbild zu ändern.|Permite el acceso a fotos para cambiar tu imagen de perfil.|Autorisez l’accès aux photos pour modifier votre photo de profil.|请允许访问照片以更新头像。
Username required|Benutzername erforderlich|Nombre de usuario requerido|Nom d’utilisateur requis|请输入用户名
Enter a username after the @ symbol.|Gib nach dem @-Zeichen einen Benutzernamen ein.|Introduce un nombre de usuario después del símbolo @.|Saisissez un nom d’utilisateur après le symbole @.|请在 @ 后输入用户名。
Demo profile updated for this session.|Demo-Profil für diese Sitzung aktualisiert.|Perfil de prueba actualizado para esta sesión.|Profil de démonstration mis à jour pour cette session.|本次会话的演示资料已更新。
Demo notification preferences saved for this session.|Demo-Benachrichtigungen für diese Sitzung gespeichert.|Preferencias de notificación guardadas para esta sesión.|Préférences de notification enregistrées pour cette session.|本次会话的演示通知偏好已保存。
Demo screen lock preference saved. Device authentication is not enabled.|Demo-Bildschirmsperre gespeichert. Geräteauthentifizierung ist nicht aktiviert.|Preferencia de bloqueo guardada. La autenticación del dispositivo no está activada.|Préférence de verrouillage enregistrée. L’authentification de l’appareil n’est pas activée.|演示屏幕锁定偏好已保存，尚未启用设备身份验证。
Legal|Rechtliches|Información legal|Mentions légales|法律信息
Help|Hilfe|Ayuda|Aide|帮助
Website|Webseite|Sitio web|Site web|网站
Add an address|Adresse hinzufügen|Añadir dirección|Ajouter une adresse|添加地址
Blacklisted Token|Gesperrter Token|Token bloqueado|Jeton bloqué|已拉黑代币
Blacklisted Wallet|Gesperrte Wallet|Billetera bloqueada|Portefeuille bloqué|已拉黑钱包
Enter an amount|Betrag eingeben|Introduce una cantidad|Saisir un montant|请输入金额
Max|Max.|Máx.|Max.|最大
Send To|Senden an|Enviar a|Envoyer à|发送给
Slide to withdraw|Zum Auszahlen schieben|Desliza para retirar|Glisser pour retirer|滑动提现
No open positions|Keine offenen Positionen|No hay posiciones abiertas|Aucune position ouverte|暂无未平仓持仓
No closed positions|Keine geschlossenen Positionen|No hay posiciones cerradas|Aucune position clôturée|暂无已平仓持仓
No paper-trade PnL for this month yet.|Noch kein Demo-Gewinn/Verlust für diesen Monat.|Aún no hay ganancias/pérdidas simuladas este mes.|Aucun gain/perte simulé ce mois-ci.|本月暂无模拟交易盈亏。
Top 10 Holder|Top-10-Holder|10 mayores titulares|10 premiers détenteurs|前十持币者
Dev Hold Percentage|Entwickleranteil|Porcentaje del desarrollador|Part du développeur|开发者持仓比例
Snipers Hold|Sniper-Anteil|Tenencia de francotiradores|Part des snipers|狙击者持仓
Freeze Auth|Einfrierberechtigung|Autoridad de congelación|Autorité de gel|冻结权限
Mint Auth|Prägeberechtigung|Autoridad de emisión|Autorité d’émission|增发权限
Buyback|Rückkauf|Recompra|Rachat|回购
Burn|Verbrennung|Quema|Destruction|销毁
Clusters|Cluster|Grupos|Groupes|集群
Group clusters|Cluster gruppieren|Agrupar grupos|Regrouper les groupes|合并集群
Ungroup clusters|Cluster auflösen|Desagrupar grupos|Dissocier les groupes|拆分集群
Liquidity|Liquidität|Liquidez|Liquidité|流动性
Paid to Holders|An Holder gezahlt|Pagado a titulares|Versé aux détenteurs|已支付持币者
Pending Payout|Ausstehende Auszahlung|Pago pendiente|Paiement en attente|待支付
Payouts|Auszahlungen|Pagos|Paiements|支付次数
Holders|Holder|Titulares|Détenteurs|持币者
Transactions|Transaktionen|Transacciones|Transactions|交易记录
PRICE|PREIS|PRECIO|PRIX|价格
MARKET CAP|MARKTKAPITALISIERUNG|CAPITALIZACIÓN|CAPITALISATION|市值
LIQUIDITY|LIQUIDITÄT|LIQUIDEZ|LIQUIDITÉ|流动性
24H VOLUME|24H-VOLUMEN|VOLUMEN 24 H|VOLUME 24 H|24 小时交易量
DEV SUPPLY|ENTWICKLERMENGE|SUMINISTRO DEL DESARROLLADOR|OFFRE DU DÉVELOPPEUR|开发者持币量
FIRST SLOT|ERSTER SLOT|PRIMER SLOT|PREMIER SLOT|首个区块时隙
ANALYZED|ANALYSIERT|ANALIZADO|ANALYSÉ|分析时间
DEV % OF SUPPLY|ENTWICKLERANTEIL|% DEL DESARROLLADOR|PART DU DÉVELOPPEUR|开发者占供应量比例
TOTAL HOLDERS|HOLDER GESAMT|TOTAL DE TITULARES|TOTAL DÉTENTEURS|持币者总数
ADDRESS|ADRESSE|DIRECCIÓN|ADRESSE|地址
MODE|MODUS|MODO|MODE|模式
LAUNCHES|STARTS|LANZAMIENTOS|LANCEMENTS|发行记录
STONK LAUNCHES|STONK-STARTS|LANZAMIENTOS STONK|LANCEMENTS STONK|STONK 发行记录
OUTSIDE|EXTERN|EXTERNOS|EXTERNES|外部
FUNDING ACCTS|FINANZIERUNGSKONTEN|CUENTAS DE FINANCIACIÓN|COMPTES DE FINANCEMENT|资金账户
LINKED|VERKNÜPFT|VINCULADOS|LIÉS|关联
COUNTERPARTIES|GEGENPARTEIEN|CONTRAPARTES|CONTREPARTIES|交易对手
MC|MK|CAP.|CAP.|市值
Dev|Entwickler|Desarrollador|Développeur|开发者
Official|Offiziell|Oficial|Officiel|官方
Mon|Mo|lun|lun.|周一
Tue|Di|mar|mar.|周二
Wed|Mi|mié|mer.|周三
Thu|Do|jue|jeu.|周四
Fri|Fr|vie|ven.|周五
Sat|Sa|sáb|sam.|周六
Sun|So|dom|dim.|周日
January|Januar|enero|janvier|一月
February|Februar|febrero|février|二月
March|März|marzo|mars|三月
April|April|abril|avril|四月
May|Mai|mayo|mai|五月
June|Juni|junio|juin|六月
July|Juli|julio|juillet|七月
August|August|agosto|août|八月
September|September|septiembre|septembre|九月
October|Oktober|octubre|octobre|十月
November|November|noviembre|novembre|十一月
December|Dezember|diciembre|décembre|十二月
● Isolated|● Isoliert|● Aislado|● Isolé|● 独立地址
● Linked cluster|● Verknüpfter Cluster|● Grupo vinculado|● Groupe lié|● 关联集群
● Dev cluster|● Entwicklercluster|● Grupo del desarrollador|● Groupe du développeur|● 开发者集群
● Magic node|● Magic-Knoten|● Nodo Magic|● Nœud Magic|● Magic 节点
result|Ergebnis|resultado|résultat|条结果
results|Ergebnisse|resultados|résultats|条结果
hidden|ausgeblendet|ocultos|masqués|已隐藏
pairs in this list.|Paare in dieser Liste.|pares en esta lista.|paires dans cette liste.|交易对。
Demo QR Placeholder|Demo-QR-Platzhalter|Marcador QR de prueba|QR de démonstration|演示二维码占位图
Fee: $0 (simulated)|Gebühr: $0 (simuliert)|Comisión: $0 (simulada)|Frais : $0 (simulés)|手续费：$0（模拟）
Network: Solana (simulated)|Netzwerk: Solana (simuliert)|Red: Solana (simulada)|Réseau : Solana (simulé)|网络：Solana（模拟）
$0 (simulated)|$0 (simuliert)|$0 (simulado)|$0 (simulé)|$0（模拟）
$93,737.34 (demo)|$93,737.34 (Demo)|$93,737.34 (prueba)|$93,737.34 (démo)|$93,737.34（演示）
A private list of wallets and tokens you will not touch. Blocked tokens, and later launches from the same dev wallet, stay out of your feed and search. Saved on this device.|Eine private Liste von Wallets und Token, die du meiden möchtest. Gesperrte Token und spätere Starts derselben Entwickler-Wallet werden in Feed und Suche ausgeblendet. Auf diesem Gerät gespeichert.|Una lista privada de billeteras y tokens que deseas evitar. Los tokens bloqueados y los futuros lanzamientos del mismo desarrollador se ocultan de tu feed y búsqueda. Guardada en este dispositivo.|Une liste privée de portefeuilles et de jetons à éviter. Les jetons bloqués et les futurs lancements du même développeur sont masqués dans le fil et la recherche. Enregistrée sur cet appareil.|用于避开特定钱包和代币的私人列表。已拉黑代币及同一开发者钱包后续发行的代币将从动态和搜索中隐藏。保存在此设备上。
Illustrative creator alerts • Not live blockchain monitoring.|Beispielhafte Erstellerwarnungen • Keine Live-Blockchain-Überwachung.|Alertas ilustrativas de creadores • Sin monitoreo en vivo de la cadena.|Alertes de créateurs illustratives • Pas de suivi blockchain en direct.|创建者提醒仅作演示 · 非实时链上监控。
By continuing, you agree to our Terms of Service and Privacy Policy.|Mit dem Fortfahren stimmst du unseren Nutzungsbedingungen und Datenschutzrichtlinien zu.|Al continuar, aceptas nuestros Términos de servicio y Política de privacidad.|En continuant, vous acceptez nos Conditions d’utilisation et notre Politique de confidentialité.|继续即表示你同意我们的服务条款和隐私政策。
Graduated tokens under 1 week old that are still above $40k, ranked by 24h volume.|Vor weniger als einer Woche graduierte Token über $40.000, nach 24h-Volumen sortiert.|Tokens graduados hace menos de una semana, aún por encima de $40.000, ordenados por volumen de 24 h.|Jetons gradués depuis moins d’une semaine, encore au-dessus de 40 000 $, classés par volume sur 24 h.|毕业未满一周且市值仍高于 $40,000 的代币，按 24 小时交易量排名。
Graduated tokens under 1 week old that are still above $40k, ranked by trading volume.|Vor weniger als einer Woche graduierte Token über $40.000, nach Handelsvolumen sortiert.|Tokens graduados hace menos de una semana, aún por encima de $40.000, ordenados por volumen.|Jetons gradués depuis moins d’une semaine, encore au-dessus de 40 000 $, classés par volume.|毕业未满一周且市值仍高于 $40,000 的代币，按交易量排名。
Trace a wallet or token address for launches, snipers, new wallets, linked wallets, and labeled counterparties.|Wallet- oder Token-Adresse auf Starts, Sniper, neue und verknüpfte Wallets sowie markierte Gegenparteien prüfen.|Rastrea una dirección para ver lanzamientos, francotiradores, billeteras nuevas y vinculadas, y contrapartes etiquetadas.|Analysez une adresse pour voir les lancements, snipers, portefeuilles nouveaux et liés, et contreparties identifiées.|追踪钱包或代币地址，查看发行、狙击者、新钱包、关联钱包及已标记交易对手。
Settings|Einstellungen|Ajustes|Paramètres|设置
Language|Sprache|Idioma|Langue|语言
Save Changes|Änderungen speichern|Guardar cambios|Enregistrer les modifications|保存更改
Saved|Gespeichert|Guardado|Enregistré|已保存
Language updated.|Sprache aktualisiert.|Idioma actualizado.|Langue mise à jour.|语言已更新。
Could not save language. Please try again.|Sprache konnte nicht gespeichert werden. Bitte erneut versuchen.|No se pudo guardar el idioma. Inténtalo de nuevo.|Impossible d’enregistrer la langue. Réessayez.|无法保存语言，请重试。
System|System|Sistema|Système|系统
Profile|Profil|Perfil|Profil|个人资料
Display Name|Anzeigename|Nombre visible|Nom affiché|显示名称
Username|Benutzername|Nombre de usuario|Nom d’utilisateur|用户名
Bio|Biografie|Biografía|Biographie|简介
Notifications|Benachrichtigungen|Notificaciones|Notifications|通知
Allow Notifications|Benachrichtigungen erlauben|Permitir notificaciones|Autoriser les notifications|允许通知
Positions|Positionen|Posiciones|Positions|持仓
Rug|Rug Pull|Estafa de liquidez|Retrait frauduleux|撤池风险
Rewards|Belohnungen|Recompensas|Récompenses|奖励
Announcements|Ankündigungen|Anuncios|Annonces|公告
Screen Lock|Bildschirmsperre|Bloqueo de pantalla|Verrouillage de l’écran|屏幕锁定
Security|Sicherheit|Seguridad|Sécurité|安全
Logout|Abmelden|Cerrar sesión|Se déconnecter|退出登录
Log out|Abmelden|Cerrar sesión|Se déconnecter|退出登录
Cancel|Abbrechen|Cancelar|Annuler|取消
Confirm|Bestätigen|Confirmar|Confirmer|确认
Continue|Weiter|Continuar|Continuer|继续
Continue as guest|Als Gast fortfahren|Continuar como invitado|Continuer en tant qu’invité|以访客身份继续
Done|Fertig|Listo|Terminé|完成
Close|Schließen|Cerrar|Fermer|关闭
Back|Zurück|Atrás|Retour|返回
Error|Fehler|Error|Erreur|错误
Success|Erfolg|Éxito|Succès|成功
Copied|Kopiert|Copiado|Copié|已复制
Copy|Kopieren|Copiar|Copier|复制
Yes|Ja|Sí|Oui|是
No|Nein|No|Non|否
Wallet|Wallet|Billetera|Portefeuille|钱包
Tokens|Token|Tokens|Jetons|代币
Token|Token|Token|Jeton|代币
Search|Suche|Buscar|Rechercher|搜索
Tracer|Tracer|Rastreador|Traceur|追踪器
Blacklist|Sperrliste|Lista de bloqueo|Liste de blocage|黑名单
Trending|Im Trend|Tendencias|Tendances|热门
New|Neu|Nuevos|Nouveaux|最新
Select Quote|Quotierungswährung wählen|Seleccionar moneda de cotización|Choisir la devise de cotation|选择计价币
All Quotes|Alle Quotierungen|Todas las cotizaciones|Toutes les cotations|全部计价币
Search quotes|Quotierung suchen|Buscar cotizaciones|Rechercher une cotation|搜索计价币
Recent|Zuletzt|Recientes|Récents|最近
Top Trades|Beste Trades|Mejores operaciones|Meilleures transactions|最佳交易
Open|Offen|Abiertas|Ouvertes|未平仓
Closed|Geschlossen|Cerradas|Clôturées|已平仓
History|Verlauf|Historial|Historique|历史
Trade|Handeln|Operar|Échanger|交易
Buy|Kaufen|Comprar|Acheter|买入
Sell|Verkaufen|Vender|Vendre|卖出
Bought|Gekauft|Comprado|Acheté|已买入
Sold|Verkauft|Vendido|Vendu|已卖出
Deposit|Einzahlen|Depositar|Déposer|充值
Withdraw|Auszahlen|Retirar|Retirer|提现
Send|Senden|Enviar|Envoyer|发送
Receive|Empfangen|Recibir|Recevoir|接收
Add|Hinzufügen|Añadir|Ajouter|添加
More options|Weitere Optionen|Más opciones|Plus d’options|更多选项
Deposit and Withdraw|Ein- und Auszahlen|Depositar y retirar|Dépôts et retraits|充值与提现
Copy Wallet Address|Wallet-Adresse kopieren|Copiar dirección de billetera|Copier l’adresse du portefeuille|复制钱包地址
Amount|Betrag|Cantidad|Montant|金额
Amount: $|Betrag: $|Cantidad: $|Montant : $|金额：$
Available|Verfügbar|Disponible|Disponible|可用
Available balance|Verfügbares Guthaben|Saldo disponible|Solde disponible|可用余额
Balance|Guthaben|Saldo|Solde|余额
Fee|Gebühr|Comisión|Frais|手续费
To|An|Para|À|收款方
Network|Netzwerk|Red|Réseau|网络
Recipient Solana address|Solana-Empfängeradresse|Dirección Solana del destinatario|Adresse Solana du destinataire|收款方 Solana 地址
Search for users|Benutzer suchen|Buscar usuarios|Rechercher des utilisateurs|搜索用户
No demo users found|Keine Demo-Benutzer gefunden|No se encontraron usuarios de prueba|Aucun utilisateur de démonstration trouvé|未找到演示用户
Search token or user|Token oder Benutzer suchen|Buscar token o usuario|Rechercher un jeton ou un utilisateur|搜索代币或用户
Search Results|Suchergebnisse|Resultados de búsqueda|Résultats de recherche|搜索结果
No matches found|Keine Treffer|No se encontraron resultados|Aucun résultat|未找到匹配结果
Try a token name, symbol, or mint address.|Tokenname, Symbol oder Mint-Adresse eingeben.|Prueba con un nombre de token, símbolo o dirección mint.|Essayez un nom de jeton, un symbole ou une adresse mint.|请尝试代币名称、符号或铸币地址。
Live Transactions|Live-Transaktionen|Transacciones en vivo|Transactions en direct|实时交易
Token Info|Token-Informationen|Información del token|Informations du jeton|代币信息
Token not found|Token nicht gefunden|Token no encontrado|Jeton introuvable|未找到代币
No live candles yet|Noch keine Live-Kerzen|Aún no hay velas en vivo|Aucune bougie en direct disponible|暂无实时 K 线
No recent trades|Keine aktuellen Trades|No hay operaciones recientes|Aucune transaction récente|暂无近期交易
Paper position|Demo-Position|Posición simulada|Position simulée|模拟持仓
Position|Position|Posición|Position|持仓
Value|Wert|Valor|Valeur|价值
Invested|Investiert|Invertido|Investi|投入金额
Profit|Gewinn|Ganancia|Bénéfice|收益
PnL|Gewinn/Verlust|Ganancias/pérdidas|Gains/pertes|盈亏
Total PnL|Gesamtgewinn/-verlust|Ganancias/pérdidas totales|Gains/pertes totaux|总盈亏
Price|Preis|Precio|Prix|价格
Market Cap|Marktkapitalisierung|Capitalización de mercado|Capitalisation boursière|市值
Market snapshot|Marktübersicht|Resumen del mercado|Aperçu du marché|市场概览
Details|Details|Detalles|Détails|详情
Creator|Ersteller|Creador|Créateur|创建者
Supply|Umlaufmenge|Suministro|Offre|供应量
Dev Hold|Entwickleranteil|Tenencia del desarrollador|Part du développeur|开发者持仓
Risk Score|Risikowert|Puntuación de riesgo|Score de risque|风险评分
Risk |Risiko |Riesgo |Risque |风险
Score|Wert|Puntuación|Score|评分
Low Risk|Geringes Risiko|Riesgo bajo|Risque faible|低风险
Moderate Risk|Mittleres Risiko|Riesgo moderado|Risque modéré|中等风险
High Risk|Hohes Risiko|Riesgo alto|Risque élevé|高风险
Critical Risk|Kritisches Risiko|Riesgo crítico|Risque critique|极高风险
Unscored|Nicht bewertet|Sin puntuación|Non évalué|未评分
Analyzing|Wird analysiert|Analizando|Analyse en cours|分析中
Scoring…|Wird bewertet…|Calculando puntuación…|Calcul du score…|评分中…
Analysis|Analyse|Análisis|Analyse|分析
Loading analysis|Analyse wird geladen|Cargando análisis|Chargement de l’analyse|正在加载分析
Analyzing address|Adresse wird analysiert|Analizando dirección|Analyse de l’adresse|正在分析地址
Holder Bubble Map|Holder-Blasenkarte|Mapa de burbujas de titulares|Carte des détenteurs|持币者气泡图
Holders distribution list|Holder-Verteilung|Distribución de titulares|Répartition des détenteurs|持币者分布列表
Fit View|Ansicht anpassen|Ajustar vista|Ajuster la vue|适应视图
Drag to pan · Use + / − to zoom · Fit View resets|Ziehen zum Verschieben · + / − zum Zoomen · Ansicht anpassen zum Zurücksetzen|Arrastra para mover · Usa + / − para ampliar · Ajustar vista restablece|Glissez pour déplacer · + / − pour zoomer · Ajuster la vue réinitialise|拖动平移 · 使用 + / − 缩放 · 点击适应视图重置
No holder map yet|Noch keine Holder-Karte|Aún no hay mapa de titulares|Aucune carte des détenteurs|暂无持币者分布图
No holders match.|Keine passenden Holder.|No hay titulares coincidentes.|Aucun détenteur correspondant.|未找到匹配的持币者。
Search address|Adresse suchen|Buscar dirección|Rechercher une adresse|搜索地址
Paste Solana address|Solana-Adresse einfügen|Pegar dirección Solana|Coller une adresse Solana|粘贴 Solana 地址
Paste a Solana wallet or token address|Solana-Wallet- oder Token-Adresse einfügen|Pega una dirección de billetera o token Solana|Collez une adresse de portefeuille ou de jeton Solana|粘贴 Solana 钱包或代币地址
Trace|Verfolgen|Rastrear|Tracer|追踪
Trace New Tokens|Neue Token verfolgen|Rastrear nuevos tokens|Tracer les nouveaux jetons|追踪新代币
Top 10 Volume|Top 10 Handelsvolumen|Top 10 por volumen|Top 10 par volume|交易量前十
Launches|Starts|Lanzamientos|Lancements|发行记录
Linked|Verknüpft|Vinculados|Liés|关联
Counterparties|Gegenparteien|Contrapartes|Contreparties|交易对手
Funding|Finanzierung|Financiación|Financement|资金来源
Healthy|Gesund|Saludable|Sain|健康
Mixed|Gemischt|Mixto|Mixte|混合
Concentrated|Konzentriert|Concentrado|Concentré|集中
Reason|Grund|Motivo|Motif|原因
Scam|Betrug|Estafa|Arnaque|诈骗
Sniper|Sniper|Francotirador|Sniper|狙击
Bundler|Bundler|Agrupador|Groupeur|捆绑交易
Insider|Insider|Información privilegiada|Initié|内幕交易
Wash/Sybil|Wash/Sybil|Lavado/Sybil|Transactions fictives/Sybil|对敲/女巫攻击
Dump|Abverkauf|Venta masiva|Vente massive|抛售
Add to Blacklist|Zur Sperrliste hinzufügen|Añadir a la lista de bloqueo|Ajouter à la liste de blocage|加入黑名单
Blocked|Gesperrt|Bloqueado|Bloqué|已拉黑
Unblocked|Entsperrt|Desbloqueado|Débloqué|已解除拉黑
Block|Sperren|Bloquear|Bloquer|拉黑
Unblock|Entsperren|Desbloquear|Débloquer|解除拉黑
Unblock address?|Adresse entsperren?|¿Desbloquear dirección?|Débloquer cette adresse ?|解除此地址的拉黑？
Remove this address from your demo blacklist?|Diese Adresse aus der Demo-Sperrliste entfernen?|¿Eliminar esta dirección de tu lista de bloqueo de prueba?|Retirer cette adresse de votre liste de blocage de démonstration ?|从演示黑名单中移除此地址？
Slide to block|Zum Sperren schieben|Desliza para bloquear|Glisser pour bloquer|滑动拉黑
Select a reason|Grund auswählen|Selecciona un motivo|Choisir un motif|请选择原因
Verify an address|Adresse prüfen|Verifica una dirección|Vérifier une adresse|请验证地址
Verifying address|Adresse wird geprüft|Verificando dirección|Vérification de l’adresse|正在验证地址
Incomplete entry|Unvollständiger Eintrag|Entrada incompleta|Informations incomplètes|信息不完整
Verify a real wallet or token address and select a reason.|Eine gültige Wallet- oder Token-Adresse prüfen und einen Grund auswählen.|Verifica una dirección real de billetera o token y selecciona un motivo.|Vérifiez une adresse réelle de portefeuille ou de jeton et choisissez un motif.|请验证真实的钱包或代币地址并选择原因。
Already blacklisted|Bereits gesperrt|Ya está bloqueado|Déjà bloqué|已在黑名单中
This address is already on your private demo blacklist.|Diese Adresse steht bereits auf deiner privaten Demo-Sperrliste.|Esta dirección ya está en tu lista privada de bloqueo de prueba.|Cette adresse figure déjà dans votre liste privée de blocage de démonstration.|此地址已在你的私人演示黑名单中。
No blacklisted addresses yet|Noch keine gesperrten Adressen|Aún no hay direcciones bloqueadas|Aucune adresse bloquée|暂无拉黑地址
Swipe an entry left to unblock|Zum Entsperren nach links wischen|Desliza una entrada a la izquierda para desbloquear|Glissez une entrée vers la gauche pour débloquer|向左滑动条目以解除拉黑
Add a wallet or token from the Blacklist form to see it here.|Wallet oder Token über das Sperrlistenformular hinzufügen.|Añade una billetera o token desde el formulario de bloqueo para verlo aquí.|Ajoutez un portefeuille ou un jeton depuis le formulaire de blocage pour le voir ici.|通过黑名单表单添加钱包或代币后，将在此显示。
Token Creator Alerts|Token-Erstellerwarnungen|Alertas de creadores de tokens|Alertes des créateurs de jetons|代币创建者提醒
Alerts|Warnungen|Alertas|Alertes|提醒
Creator of|Ersteller von|Creador de|Créateur de|创建者
just launched|gerade gestartet|acaba de lanzar|vient de lancer|刚刚发行
saved|gespeichert|guardados|enregistrés|已保存
Auto|Automatisch|Automático|Automatique|自动
Slippage|Slippage|Deslizamiento|Glissement|滑点
Price Impact|Preiseinfluss|Impacto en el precio|Impact sur le prix|价格影响
Estimated Output|Geschätzter Ausgabebetrag|Cantidad estimada a recibir|Montant estimé reçu|预计到账
Slide to buy|Zum Kaufen schieben|Desliza para comprar|Glisser pour acheter|滑动买入
Slide to sell|Zum Verkaufen schieben|Desliza para vender|Glisser pour vendre|滑动卖出
Slide to send|Zum Senden schieben|Desliza para enviar|Glisser pour envoyer|滑动发送
Confirm Demo Withdrawal|Demo-Auszahlung bestätigen|Confirmar retiro de prueba|Confirmer le retrait de démonstration|确认模拟提现
Transfer History|Übertragungsverlauf|Historial de transferencias|Historique des transferts|转账历史
No demo transfers recorded.|Keine Demo-Übertragungen aufgezeichnet.|No hay transferencias de prueba registradas.|Aucun transfert de démonstration enregistré.|暂无模拟转账记录。
No demo trades yet|Noch keine Demo-Trades|Aún no hay operaciones de prueba|Aucune transaction de démonstration|暂无模拟交易
No positions yet. Paper-buy a token to test this calendar.|Noch keine Positionen. Kaufe einen Token im Demo-Modus, um diesen Kalender zu testen.|Aún no hay posiciones. Compra un token simulado para probar este calendario.|Aucune position. Achetez un jeton en simulation pour tester ce calendrier.|暂无持仓。模拟买入代币以测试此日历。
Holder Rewards|Holder-Belohnungen|Recompensas de titulares|Récompenses des détenteurs|持币奖励
Total Rewards|Gesamtbelohnungen|Recompensas totales|Récompenses totales|总奖励
Holding|Bestand|Tenencia|Détention|持有量
Reward type|Belohnungsart|Tipo de recompensa|Type de récompense|奖励类型
24 Hours|24 Stunden|24 horas|24 heures|24 小时
All Time|Gesamter Zeitraum|Todo el tiempo|Depuis le début|全部时间
24H Reward Snapshot|24h-Belohnungsübersicht|Resumen de recompensas de 24 h|Aperçu des récompenses sur 24 h|24 小时奖励快照
All Time Reward Snapshot|Gesamte Belohnungsübersicht|Resumen de recompensas histórico|Aperçu de toutes les récompenses|全部奖励快照
Snapshot|Übersicht|Instantánea|Aperçu|快照
Demo Snapshot|Demo-Übersicht|Instantánea de prueba|Aperçu de démonstration|演示快照
Preparing snapshot|Übersicht wird vorbereitet|Preparando instantánea|Préparation de l’aperçu|正在准备快照
Paper trade|Demo-Trade|Operación simulada|Transaction simulée|模拟交易
Demo|Demo|Demostración|Démonstration|演示
(demo)|(Demo)|(prueba)|(démo)|（演示）
Demo paper trade|Demo-Trade|Operación simulada|Transaction simulée|模拟交易
Demo mode • No account required|Demo-Modus • Kein Konto erforderlich|Modo de prueba • No requiere cuenta|Mode démonstration • Aucun compte requis|演示模式 · 无需账户
Demo account • Not connected|Demo-Konto • Nicht verbunden|Cuenta de prueba • No conectada|Compte de démonstration • Non connecté|演示账户 · 未连接
DEMO WALLET · No real funds|DEMO-WALLET · Kein echtes Geld|BILLETERA DE PRUEBA · Sin fondos reales|PORTEFEUILLE DÉMO · Aucun fonds réel|演示钱包 · 无真实资金
Demo only • No real funds are sent.|Nur Demo • Es wird kein echtes Geld gesendet.|Solo prueba • No se envían fondos reales.|Démonstration uniquement • Aucun fonds réel n’est envoyé.|仅演示 · 不会发送真实资金。
No real transfer will occur.|Es erfolgt keine echte Übertragung.|No se realizará ninguna transferencia real.|Aucun transfert réel n’aura lieu.|不会进行真实转账。
Simulation only • No real transfer will occur.|Nur Simulation • Keine echte Übertragung.|Solo simulación • No se realizará ninguna transferencia real.|Simulation uniquement • Aucun transfert réel n’aura lieu.|仅模拟 · 不会进行真实转账。
Demo paper trade only. Buys show in your portfolio and position.|Nur Demo-Trades. Käufe erscheinen in deinem Portfolio und deinen Positionen.|Solo operaciones simuladas. Las compras aparecen en tu cartera y posición.|Transactions simulées uniquement. Les achats apparaissent dans votre portefeuille et vos positions.|仅限模拟交易。买入将显示在你的投资组合和持仓中。
Slide to confirm • Demo only. No on-chain blocking.|Zum Bestätigen schieben • Nur Demo. Keine On-Chain-Sperre.|Desliza para confirmar • Solo prueba. Sin bloqueo en cadena.|Glisser pour confirmer • Démonstration. Aucun blocage sur la blockchain.|滑动确认 · 仅演示，不执行链上封锁。
Wallet address not connected|Wallet-Adresse nicht verbunden|Dirección de billetera no conectada|Adresse du portefeuille non connectée|尚未连接钱包地址
Deposit SOL to add to your cash balance.|SOL einzahlen, um dein Guthaben zu erhöhen.|Deposita SOL para aumentar tu saldo.|Déposez du SOL pour augmenter votre solde.|充值 SOL 以增加可用余额。
Send any token on the Solana network.|Beliebigen Token im Solana-Netzwerk senden.|Envía cualquier token de la red Solana.|Envoyez n’importe quel jeton sur le réseau Solana.|发送 Solana 网络上的任意代币。
Performance Overview|Leistungsübersicht|Resumen de rendimiento|Aperçu des performances|表现概览
Profitable Days/Amount|Gewinntage/Betrag|Días rentables/Importe|Jours rentables/Montant|盈利天数/金额
Panel Mode|Panel-Modus|Modo panel|Mode panneau|面板模式
List Mode|Listenmodus|Modo lista|Mode liste|列表模式
This launch pays the creator, not holders.|Diese Ausgabe bezahlt den Ersteller, nicht die Holder.|Este lanzamiento paga al creador, no a los titulares.|Ce lancement rémunère le créateur, pas les détenteurs.|此发行向创建者支付奖励，不向持币者支付。
This is a transparent behavioral index, not a determination that anyone is a rug-puller.|Dies ist ein transparenter Verhaltensindex und keine Feststellung, dass jemand einen Rug Pull begeht.|Este es un índice de comportamiento transparente, no una determinación de que alguien cometa una estafa de liquidez.|Il s’agit d’un indice comportemental transparent, pas d’une conclusion selon laquelle une personne commet une fraude.|这是透明的行为指标，并非认定任何人会实施撤池诈骗。
Loading chart|Chart wird geladen|Cargando gráfico|Chargement du graphique|正在加载图表
Loading holder map|Holder-Karte wird geladen|Cargando mapa de titulares|Chargement de la carte des détenteurs|正在加载持币者分布图
Loading portfolio history|Portfolioverlauf wird geladen|Cargando historial de cartera|Chargement de l’historique du portefeuille|正在加载投资组合历史
Calculating risk score|Risikowert wird berechnet|Calculando riesgo|Calcul du score de risque|正在计算风险评分
Update available|Update verfügbar|Actualización disponible|Mise à jour disponible|有可用更新
A new StonkWatcher update is available. Download it now?|Ein neues StonkWatcher-Update ist verfügbar. Jetzt herunterladen?|Hay una actualización de StonkWatcher. ¿Descargar ahora?|Une mise à jour StonkWatcher est disponible. La télécharger ?|StonkWatcher 有新更新，立即下载？
Download|Herunterladen|Descargar|Télécharger|下载
Later|Später|Más tarde|Plus tard|稍后
Restart|Neu starten|Reiniciar|Redémarrer|重新启动
Update ready|Update bereit|Actualización lista|Mise à jour prête|更新已就绪
Restart StonkWatcher to apply the update.|StonkWatcher neu starten, um das Update anzuwenden.|Reinicia StonkWatcher para aplicar la actualización.|Redémarrez StonkWatcher pour appliquer la mise à jour.|重新启动 StonkWatcher 以应用更新。
Update unavailable|Update nicht verfügbar|Actualización no disponible|Mise à jour indisponible|更新不可用
Could not download the update. Please try again when you reopen the app.|Update konnte nicht heruntergeladen werden. Versuche es beim nächsten Öffnen erneut.|No se pudo descargar la actualización. Inténtalo al volver a abrir la aplicación.|Impossible de télécharger la mise à jour. Réessayez à la prochaine ouverture.|无法下载更新，请重新打开应用后再试。
`;
export const TRANSLATIONS: Record<string, Partial<Record<AppLocale, string>>> = {};
for (const row of rows.trim().split("\n")) {
  const [en, de, es, fr, zh] = row.split("|");
  TRANSLATIONS[en.trim()] = { de: de?.trim(), es: es?.trim(), fr: fr?.trim(), zh: zh?.trim() };
}
export function translateText(text: string, locale: AppLocale): string {
  if (locale === "en") return text;
  const key = text.trim();
  const translated = TRANSLATIONS[key]?.[locale];
  if (!translated) return text;
  return text.slice(0, text.indexOf(key)) + translated + text.slice(text.indexOf(key) + key.length);
}
