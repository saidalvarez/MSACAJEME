import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Ticket } from '../types';

// Tipos de formato
export type QuoteFormatType = 'basic' | 'payment_info' | 'payment_no_retention';

const emeraldColor = '#059669'; // Emerald 600
const emeraldLightColor = '#d1fae5'; // Emerald 100

const styles = StyleSheet.create({
  page: { 
    paddingTop: 30, // Reduced from 45 to give more space
    paddingLeft: 40,
    paddingRight: 40,
    paddingBottom: 40,
    fontFamily: 'Helvetica', 
    fontSize: 10, 
    color: '#000000',
  },
  topEmeraldBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 15,
    backgroundColor: emeraldColor
  },
  // -- Encabezado --
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  logoBox: { width: 260, height: 75 },
  logoImg: { width: '100%', height: '100%', objectFit: 'contain' },
  businessName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#1e3a8a', lineHeight: 1.2 },
  businessSub: { fontSize: 9, color: '#475569', marginTop: 2, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1 },
  headerRight: { 
    alignItems: 'flex-end',
    width: 200,
  },
  mainTitle: { 
    fontFamily: 'Helvetica-Bold',
    fontSize: 32, 
    color: '#374151', // Gris oscuro sólido
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  infoHLabel: { 
    fontSize: 11, 
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a8a', // Azul oscuro
    marginBottom: 4 
  },
  infoHValue: { 
    fontSize: 11, 
    width: 120,
    textAlign: 'center',
    paddingTop: 3,
    marginBottom: 8,
    color: '#000000',
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    borderTopStyle: 'solid',
  },
  // -- Info Cliente y Contacto/Pago --
  topInfoBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  infoColumn: {
    width: '48%'
  },
  infoTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a8a',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
    paddingBottom: 2,
    marginBottom: 6,
    flexDirection: 'row',
  },
  clientNameValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#000',
    paddingLeft: 10,
    textTransform: 'uppercase'
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    width: 60,
    fontSize: 10,
    color: '#475569',
    fontFamily: 'Helvetica-Bold',
  },
  infoValue: {
    flex: 1,
    fontSize: 10,
    color: '#000000',
  },
  paymentText: {
    marginBottom: 3,
    fontSize: 10,
    color: '#000000',
  },
  paymentLink: {
    color: '#2563eb', // Blueish aesthetic link
    fontFamily: 'Helvetica-Bold'
  },
  paymentGrid: {
    marginTop: 4
  },
  // -- Tabla Principal --
  table: { 
    width: '100%', 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderRadius: 4,
    overflow: 'hidden'
  },
  tHead: { 
    flexDirection: 'row', 
    backgroundColor: emeraldColor, 
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  thCol1: { width: '10%', padding: 5, textAlign: 'center' },
  thCol2: { width: '40%', padding: 5, textAlign: 'center' },
  thCol3: { width: '17%', padding: 5, textAlign: 'right' },
  thCol4: { width: '17%', padding: 5, textAlign: 'right' },
  thCol5: { width: '16%', padding: 5, textAlign: 'right' },
  tRow: { 
    flexDirection: 'row', 
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
    fontSize: 10
  },
  tRowOdd: { backgroundColor: '#f8fafc' }, // Lighter grid
  tRowEven: { backgroundColor: '#ffffff' },
  tdCol1: { width: '10%', padding: 4, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  tdCol2: { width: '40%', padding: 4, paddingLeft: 6, borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  tdCol3: { width: '17%', padding: 4, textAlign: 'right', borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  tdCol4: { width: '17%', padding: 4, textAlign: 'right', borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  tdCol5: { width: '16%', padding: 4, textAlign: 'right', color: '#059669', fontFamily: 'Helvetica-Bold' },
  
  // -- Footer / Totales --
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10
  },
  footerLeft: {
    width: '50%'
  },
  totalsBox: { 
    width: 200,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden'
  },
  totRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid'
  },
  totLabel: { 
    color: '#475569',
    fontSize: 10,
    textAlign: 'right',
    flex: 1,
    paddingRight: 15,
    paddingVertical: 4
  },
  totValue: { 
    textAlign: 'right',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    width: 80,
    paddingVertical: 4,
    paddingRight: 6,
    backgroundColor: '#ffffff',
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
  },
  totRowEmeraldContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: emeraldLightColor,
  },
  totLabelEmerald: {
    fontFamily: 'Helvetica-Bold',
    color: emeraldColor,
    fontSize: 11,
    textAlign: 'right',
    flex: 1,
    paddingRight: 15,
    paddingTop: 6,
    paddingBottom: 6
  },
  totValueEmeraldCell: {
    textAlign: 'right',
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: emeraldColor,
    width: 80,
    paddingTop: 6,
    paddingBottom: 6,
    paddingRight: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#34d399',
    borderLeftStyle: 'solid'
  },
  // -- Firmas y Footer --
  signArea: {
    marginTop: 10,
    width: 180,
    alignItems: 'flex-start'
  },
  signTitle: {
    color: emeraldColor,
    fontSize: 11,
    marginBottom: 25,
    fontFamily: 'Helvetica-Bold'
  },
  signLine: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
    paddingTop: 4,
    fontSize: 9,
    width: '100%',
    textAlign: 'left',
  },
  emeraldBanner: {
    backgroundColor: emeraldColor,
    color: '#fff',
    padding: 3,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 15,
    fontSize: 8,
  }
});

const formatNum = (num: string | number) => {
  const n = Number(num || 0);
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseNumber = (val: string | number | undefined | null): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]+/g, "");
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
};

export interface QuotePDFItem {
  id?: string | number;
  name?: string;
  price?: string | number;
  purchase_price?: string | number;
  quantity?: string | number;
  inventory_id?: string;
}

interface ProfitPDFProps {
  quote: Ticket;
  formatType?: QuoteFormatType;
}

export const ProfitPDF = ({ quote, formatType = 'basic' }: ProfitPDFProps) => {
  const safeItems = quote?.items || [];
  
  // Custom utility calculations
  const totalCost = safeItems.reduce((acc, item) => acc + (parseNumber((item as any).purchase_price || (item as any).purchasePrice) * parseNumber(item.quantity || 1)), 0);
  const totalSale = safeItems.reduce((acc, item) => acc + (parseNumber(item.price) * parseNumber(item.quantity || 1)), 0);
  const totalProfitNet = totalSale - totalCost;

  // Llenar filas vacías para emparejar el diseño de excel - Reducido a 8 para evitar saltos de página innecesarios
  const emptyRowsCount = Math.max(0, 8 - safeItems.length);
  const emptyRows = Array.from({ length: emptyRowsCount }).map((_, i) => i);

  // Safe extract logic for snake_case/camelCase dual support
  const q: Record<string, unknown> = (quote as unknown) as Record<string, unknown> || {};
  const ticketNum = Number(q.ticket_number || q.ticketNumber || 0);
  const clientNameStr = String(q.client_name || q.clientName || 'Cliente');
  const clientPhoneStr = String(q.client_phone || q.clientPhone || 'No proporcionado');
  const clientEmailStr = String(q.client_email || q.clientEmail || 'No proporcionado');
  const vehicleStr = String(q.vehicle || 'No especificado');
  const dateStr = q.date ? new Date(q.date as string).toLocaleDateString() : new Date().toLocaleDateString();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* WATERMARK QUITADA A PETICIÓN */}

        {/* FRANJA ROJA SUPERIOR ESTILO DISEÑO */}
        <View style={styles.topEmeraldBanner} />

        {/* ENCABEZADO */}
        <View style={styles.headerRow}>
          <View style={styles.logoBox}>
            <Image src="/logo.png" style={styles.logoImg} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.mainTitle}>R. UTILIDADES</Text>
            
            <Text style={styles.infoHLabel}>Fecha</Text>
            <Text style={[styles.infoHValue, styles.borderTop]}>{String(dateStr)}</Text>
            
            <Text style={styles.infoHLabel}>Folio Nº</Text>
            <Text style={[styles.infoHValue, styles.borderTop]}>{String(ticketNum).padStart(6, '0')}</Text>
          </View>
        </View>

        {/* INFO CIENTE Y CONTACTO */}
        <View style={styles.topInfoBlock}>
          
          {/* Columna Cliente */}
          <View style={styles.infoColumn}>
             <View style={styles.infoTitle}>
                <Text>Vehículo</Text>
                <Text style={styles.clientNameValue}>{vehicleStr}</Text>
             </View>
             <View style={styles.infoRow}>
               <Text style={styles.infoLabel}>Nombre:</Text>
               <Text style={styles.infoValue}>{clientNameStr}</Text>
             </View>
             <View style={styles.infoRow}>
               <Text style={styles.infoLabel}>Teléfono:</Text>
               <Text style={styles.infoValue}>{clientPhoneStr}</Text>
             </View>
             <View style={styles.infoRow}>
               <Text style={styles.infoLabel}>Email:</Text>
               <Text style={styles.infoValue}>{clientEmailStr}</Text>
             </View>
          </View>

          {/* Columna Info / Datos de Pago */}
          <View style={styles.infoColumn}>
             {formatType === 'basic' ? (
                <>
                  <View style={styles.infoTitle}>
                      <Text>Información de contacto</Text>
                  </View>
                  <Text style={styles.paymentText}>Calle 6 de Abril #516, entre Chihuahua y Veracruz, Col. Centro.</Text>
                  <Text style={styles.paymentText}>6441452026</Text>
                  <Text style={styles.paymentLink}>msacajeme@gmail.com</Text>
                </>
             ) : (
                <>
                  <View style={styles.infoTitle}>
                      <Text>Datos de Pago</Text>
                  </View>
                  <Text style={styles.paymentText}>Calle 6 de Abril #516, entre Chihuahua y Veracruz, Col. Centro.</Text>
                  
                  <View style={styles.paymentGrid}>
                     <Text style={[styles.paymentText, {textTransform:'uppercase', fontFamily: 'Helvetica-Bold'}]}>ELEAZAR ARMENTA TABARDILLO</Text>
                     <Text style={[styles.paymentText, {textTransform:'uppercase', fontFamily: 'Helvetica-Bold'}]}>TEL 6441452026</Text>
                     <Text style={[styles.paymentText, {textTransform:'uppercase', fontFamily: 'Helvetica-Bold'}]}>BANCO: HSBC</Text>
                     <Text style={[styles.paymentText, {textTransform:'uppercase', fontFamily: 'Helvetica-Bold'}]}>CUENTA: 021767066350860324</Text>
                  </View>

                  <Text style={[styles.paymentLink, {marginTop: 2}]}>msacajeme@gmail.com</Text>
                </>
             )}
          </View>
          
        </View>

           {/* TABLA PRINCIPAL */}
        <View style={styles.table}>
           <View style={styles.tHead}>
             <Text style={styles.thCol1}>CANT.</Text>
             <Text style={styles.thCol2}>DESCRIPCIÓN</Text>
             <Text style={styles.thCol3}>P. TALLER</Text>
             <Text style={styles.thCol4}>P. VENTA</Text>
             <Text style={styles.thCol5}>UTILIDAD</Text>
           </View>

           {/* Mano de Obra / ServiciosPrincipales */}
           {safeItems.filter((i: any) => !i.inventory_id).length > 0 && (
             <View style={[styles.tRow, {backgroundColor: '#e2e8f0'}]}>
                 <Text style={[styles.tdCol2, {width: '100%', fontFamily: 'Helvetica-Bold', color: '#334155', textAlign: 'left', paddingVertical: 2, fontSize: 9, paddingLeft: 8}]}>MANO DE OBRA Y SERVICIOS</Text>
             </View>
           )}
           {safeItems.filter((i: any) => !i.inventory_id).map((item: any, i: number) => {
             const cost = parseNumber(item.purchase_price || item.purchasePrice);
             const sale = parseNumber(item.price);
             const qty = parseNumber(item.quantity || 1);
             const profit = (sale - cost) * qty;
             return (
               <View key={`svc-${item.id || i}`} style={[styles.tRow, i % 2 === 0 ? styles.tRowEven : styles.tRowOdd]}>
                 <Text style={styles.tdCol1}>{String(qty)}</Text>
                 <Text style={[styles.tdCol2, {textTransform: 'uppercase'}]}>{String(item.name || 'Servicio sin nombre')}</Text>
                 <Text style={styles.tdCol3}>{formatNum(cost * qty)}</Text>
                 <Text style={styles.tdCol4}>{formatNum(sale * qty)}</Text>
                 <Text style={styles.tdCol5}>+{formatNum(profit)}</Text>
               </View>
             );
           })}

           {/* Refacciones e Insumos */}
           {safeItems.filter((i: any) => i.inventory_id).length > 0 && (
             <View style={[styles.tRow, {backgroundColor: '#e2e8f0', borderTopWidth: 2, borderTopColor: '#cbd5e1'}]}>
                 <Text style={[styles.tdCol2, {width: '100%', fontFamily: 'Helvetica-Bold', color: '#334155', textAlign: 'left', paddingVertical: 2, fontSize: 9, paddingLeft: 8}]}>REFACCIONES E INSUMOS</Text>
             </View>
           )}
           {safeItems.filter((i: any) => i.inventory_id).map((item: any, i: number) => {
             const cost = parseNumber(item.purchase_price || item.purchasePrice);
             const sale = parseNumber(item.price);
             const qty = parseNumber(item.quantity || 1);
             const profit = (sale - cost) * qty;
             return (
               <View key={`part-${item.id || i}`} style={[styles.tRow, i % 2 === 0 ? styles.tRowEven : styles.tRowOdd]}>
                 <Text style={styles.tdCol1}>{String(qty)}</Text>
                 <Text style={[styles.tdCol2, {textTransform: 'uppercase'}]}>{String(item.name || 'Articulo sin nombre')}</Text>
                 <Text style={styles.tdCol3}>{formatNum(cost * qty)}</Text>
                 <Text style={styles.tdCol4}>{formatNum(sale * qty)}</Text>
                 <Text style={styles.tdCol5}>+{formatNum(profit)}</Text>
               </View>
             );
           })}

           {/* Celdas Vacías de Relleno */}
           {emptyRows.map((_, i) => {
             const actualIndex = safeItems.length + (safeItems.filter((k: any) => !k.inventory_id).length > 0 ? 1 : 0) + (safeItems.filter((k: any) => k.inventory_id).length > 0 ? 1 : 0) + i;
             return (
              <View key={`empty-${i}`} style={[styles.tRow, actualIndex % 2 === 0 ? styles.tRowEven : styles.tRowOdd]}>
                <Text style={styles.tdCol1}> </Text>
                <Text style={styles.tdCol2}> </Text>
                <Text style={styles.tdCol3}> </Text>
                <Text style={styles.tdCol4}> </Text>
                <Text style={styles.tdCol5}> </Text>
              </View>
             )
           })}
        </View>

        {/* FOOTER Y TOTALES */}
        <View style={styles.footerContainer}>
            
            {/* Columna Izquierda (Info y Firma) */}
            <View style={styles.footerLeft}>
               {formatType !== 'basic' ? (
                 <>
                  <Text style={{fontWeight: 700, fontSize: 10, marginBottom: 4}}>Información de contacto</Text>
                  <Text style={{fontSize: 9.5, marginBottom: 2, fontWeight: 500}}>Calle 6 de Abril #516, entre Chihuahua y Veracruz, Col. Centro.</Text>
                  <Text style={{fontSize: 9.5, marginBottom: 2, fontWeight: 700}}>Tel: 6441452026</Text>
                  <Text style={[styles.paymentLink, {fontSize: 9.5, marginBottom: 15}]}>E-mail: msacajeme@gmail.com</Text>
                  
                   <View style={{flexDirection: 'row', alignItems: 'flex-start', marginTop: 10}}>
                     <View style={styles.signArea}>
                        <Text style={styles.signTitle}>FIRMA</Text>
                        <Text style={styles.signLine}>Eleazar Armenta Tabardillo</Text>
                     </View>
                  </View>
                 </>
               ) : (
                 <View />
               )}
            </View>

            {/* Columna Derecha (Totales) */}
            <View style={styles.totalsBox}>
               <View style={styles.totRow}>
                 <Text style={styles.totLabel}>Total Venta (Público)</Text>
                 <Text style={styles.totValue}>{formatNum(totalSale)}</Text>
               </View>
               <View style={styles.totRow}>
                 <Text style={styles.totLabel}>Total Inversión (Taller)</Text>
                 <Text style={styles.totValue}>{formatNum(totalCost)}</Text>
               </View>
               
               <View style={[styles.totRowEmeraldContainer, { borderTopWidth: 0, marginTop: 4 }]}>
                 <Text style={styles.totLabelEmerald}>GANANCIA NETA</Text>
                 <Text style={styles.totValueEmeraldCell}>+${formatNum(totalProfitNet)}</Text>
               </View>

            </View>

        </View>

        {/* Banner Base */}
        <Text style={styles.emeraldBanner}>REPORTE ESTRICTAMENTE CONFIDENCIAL - USO INTERNO DEL TALLER</Text>
        
      </Page>
    </Document>
  );
};
