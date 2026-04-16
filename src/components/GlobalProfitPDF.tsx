import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { 
    paddingTop: 30, 
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
    backgroundColor: '#059669'
  },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  logoBox: { width: 200, height: 60 },
  logoImg: { width: '100%', height: '100%', objectFit: 'contain' },
  headerRight: { 
    alignItems: 'flex-end',
    width: 250,
  },
  mainTitle: { 
    fontFamily: 'Helvetica-Bold',
    fontSize: 24, 
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  dateString: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    color: '#6b7280',
  },
  // -- Summary Cards --
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  summaryCol: {
    width: '23%',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 5,
  },
  summaryColEmerald: {
    width: '23%',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    padding: 10,
    borderRadius: 5,
  },
  summaryLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  summaryLabelEmerald: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
  },
  summaryValueEmerald: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
  },
  // -- Table --
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    padding: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    marginTop: 10,
    textTransform: 'uppercase'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: 8,
    fontSize: 9,
    alignItems: 'center',
  },
  colConcept: { flex: 4 },
  colQty: { flex: 1, textAlign: 'center' },
  colCost: { flex: 2, textAlign: 'right' },
  colTurnover: { flex: 2, textAlign: 'right' },
  colProfit: { flex: 2, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#059669' },
  colMargin: { flex: 1, textAlign: 'right' },
  
  // -- Group Headers --
  groupHeader: {
    backgroundColor: '#f1f5f9',
    padding: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    marginTop: 5,
  },
  groupSummary: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#64748b'
  },
  redBanner: {
    backgroundColor: '#059669',
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

const formatNum = (num: number) => {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface GlobalProfitPDFProps {
  title: string;
  dateStr: string;
  totals: { revenue: number, cost: number, profit: number, margin: number, tickets: number };
  items: any[];
}

export const GlobalProfitPDF = ({ title, dateStr, totals, items }: GlobalProfitPDFProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topEmeraldBanner} />
        
        {/* ENCABEZADO */}
        <View style={styles.headerRow}>
          <View style={styles.logoBox}>
            <Image src="/logo.png" style={styles.logoImg} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.mainTitle}>{title}</Text>
            <Text style={styles.dateString}>{dateStr}</Text>
          </View>
        </View>

        {/* SUMMARY CARDS */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Ingreso (Ventas)</Text>
            <Text style={styles.summaryValue}>${formatNum(totals.revenue)}</Text>
          </View>
          <View style={styles.summaryCol}>
             <Text style={styles.summaryLabel}>Costo Taller</Text>
             <Text style={styles.summaryValue}>${formatNum(totals.cost)}</Text>
          </View>
          <View style={styles.summaryColEmerald}>
             <Text style={styles.summaryLabelEmerald}>Utilidad Neta</Text>
             <Text style={styles.summaryValueEmerald}>+${formatNum(totals.profit)}</Text>
          </View>
          <View style={styles.summaryCol}>
             <Text style={styles.summaryLabel}>Margen / Ops</Text>
             <Text style={styles.summaryValue}>{totals.margin.toFixed(1)}% / {totals.tickets}</Text>
          </View>
        </View>

        {/* TABLE HEADER */}
        <View style={styles.tableHeader}>
          <Text style={styles.colConcept}>Folio / Concepto</Text>
          <Text style={styles.colQty}>Cant.</Text>
          <Text style={styles.colCost}>Costo</Text>
          <Text style={styles.colTurnover}>Venta</Text>
          <Text style={styles.colProfit}>Utilidad</Text>
          <Text style={styles.colMargin}>Mg%</Text>
        </View>

        {/* TABLE BODY grouped by tickets/sales */}
        {items.map((ticket, tIdx) => (
           <View key={tIdx} wrap={false}>
             <View style={styles.groupHeader}>
               <Text>{ticket.title}</Text>
               <Text style={styles.groupSummary}>Ganancia: +${formatNum(ticket.profit)}</Text>
             </View>
             {ticket.details.map((row: any, rIdx: number) => (
                <View style={styles.tableRow} key={rIdx}>
                  <Text style={styles.colConcept}>{row.name}</Text>
                  <Text style={styles.colQty}>{row.qty}</Text>
                  <Text style={styles.colCost}>${formatNum(row.cost)}</Text>
                  <Text style={styles.colTurnover}>${formatNum(row.rev)}</Text>
                  <Text style={[styles.colProfit, { color: row.profit < 0 ? '#ef4444' : '#059669'}]}>
                     {row.profit > 0 ? '+' : ''}${formatNum(row.profit)}
                  </Text>
                  <Text style={styles.colMargin}>{row.margin.toFixed(0)}%</Text>
                </View>
             ))}
           </View>
        ))}

        <Text style={styles.redBanner} fixed>MSA CAJEME - REPORTE GENERADO AUTOMÁTICAMENTE</Text>
      </Page>
    </Document>
  );
};
