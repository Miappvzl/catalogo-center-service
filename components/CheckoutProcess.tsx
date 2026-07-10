"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import PayPalGateway from "./checkout/PayPalGateway";
import {
    Store,
    Truck,
    Package,
    CreditCard,
    Check,
    X,
    Trash2,
    Image as ImageIcon,
    Upload,
    Loader2,
    MessageCircle,
    Copy,
    Sparkle,
    Zap,
    ArrowLeft,
    Wallet,
    AlertCircle
} from "lucide-react";
import { getSupabase } from "@/lib/supabase-client";
import { compressImage } from "@/utils/imageOptimizer";
import { useCart } from "@/app/store/useCart";
import Swal from "sweetalert2";
import { Icon } from "@iconify/react";
// 🚀 IMPORTS DE LOGÍSTICA
import { MrwIcon } from "@/components/ui/icons/MrwIcon";
import { ZoomIcon } from "@/components/ui/icons/ZoomIcon";
import { TealcaIcon } from "@/components/ui/icons/TealcaIcon";

// --- TIPOS ESTRICTOS ---
export interface CheckoutProcessProps {
    storeId: string;
    storeConfig: any;
    currency: "usd" | "eur";
    rates: { usd: number; eur: number };
    phone: string;
    cartEngine: any;
    wholesaleDiscountList: number;
    wholesaleDiscountCash: number;
    affiliateCode?: string | null; // 🚀 NUEVO
    affiliateDiscountList?: number; // 🚀 NUEVO
    affiliateDiscountCash?: number; // 🚀 NUEVO
    onSuccess: (
        orderNumber: number,
        whatsappUrl: string,
        orderId: string,
    ) => void; // 🚀 AÑADE orderId AQUÍ
    onBack: () => void;
}

interface PaymentBlock {
    id: string;
    method: string;
    amount: number;
    currency: "usd" | "ves";
    isHardCurrency: boolean;
    receiptFile: File | null;
    receipt_url?: string; // 🚀 AÑADE ESTA LÍNEA
}

const BrandLogos = {
    Transferencia: ({ className, size }: any) => (
        <Icon
            icon="ph:bank-bold"
            className={className}
            width={size}
            height={size}
        />
    ),
    Zelle: ({ className, size }: any) => (
        <Icon
            icon="simple-icons:zelle"
            className={className}
            width={size}
            height={size}
        />
    ),
    Binance: ({ className, size }: any) => (
        <Icon
            icon="simple-icons:binance"
            className={className}
            width={size}
            height={size}
        />
    ),
    PagoMovil: ({ className, size }: any) => (
        <Icon
            icon="fluent:phone-checkmark-24-regular"
            className={className}
            width={size}
            height={size}
        />
    ),
    Efectivo: ({ className, size }: any) => (
        <Icon icon="bi:cash" className={className} width={size} height={size} />
    ),
    Zinli: ({ className, size }: any) => (
        <Icon
            icon="mdi:wallet-bifold"
            className={className}
            width={size}
            height={size}
        />
    ),
    WallyTech: ({ className, size }: any) => (
        <Icon
            icon="solar:wallet-bold"
            className={className}
            width={size}
            height={size}
        />
    ),
    PayPal: ({ className, size }: any) => (
        <Icon
            icon="simple-icons:paypal"
            className={className}
            width={size}
            height={size}
        />
    ),
};

// 🚀 DICCIONARIO DE AGENCIAS DE ENVÍO
const CourierLogos: { [key: string]: any } = {
    MRW: ({ className }: any) => <MrwIcon className={className} />,
    Zoom: ({ className }: any) => <ZoomIcon className={className} />,
    Tealca: ({ className }: any) => <TealcaIcon className={className} />,
};

export default function CheckoutProcess({
    storeId,
    storeConfig,
    currency,
    rates,
    phone,
    cartEngine,
    wholesaleDiscountList,
    wholesaleDiscountCash,
    onSuccess,
    onBack,
    affiliateCode,
    affiliateDiscountList,
    affiliateDiscountCash,
}: CheckoutProcessProps) {
    const { items, clearCart } = useCart();
    const [checkoutState, setCheckoutState] = useState<'idle' | 'validating' | 'processing' | 'success'>('idle');
    const [errors, setErrors] = useState<Record<string, string>>({}); // 🚀 MOTOR DE ERRORES ORGÁNICOS
    const [supabase] = useState(() => getSupabase());
    const [pfOriginBank, setPfOriginBank] = useState('');
    const [pfOriginPhone, setPfOriginPhone] = useState('');
    const [pfReference, setPfReference] = useState('');

    // 🚀 LÓGICA DE PORTAPAPELES (Para el Brand Portal)
    const [copied, setCopied] = useState(false);
    const handleCopy = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isEurMode = currency === "eur";
    const activeRate = isEurMode ? rates.eur : rates.usd;
    const currencySymbol = "$";

    // --- CONFIGURACIONES ---
    const payments = storeConfig?.payment_config || {};
    const shipping = storeConfig?.shipping_config || {};
    const receiptConfig = storeConfig?.receipt_config || { strict_mode: false };
    const wholesale = storeConfig?.wholesale_config || {
        active: false,
        min_items: 6,
        discount_percentage: 15,
    };
    const deliveryZones = shipping.delivery_zones || [];

    // 🚀 LÓGICA DE MÉTODOS Y DIVISAS
    const paymentKeysMap: { [key: string]: string } = {
        Transferencia: "transferencia",
        "Pago Móvil": "pago_movil",
        Zelle: "zelle",
        Binance: "binance",
        Zinli: "zinli",
        WallyTech: "wally",
        Efectivo: "cash",
        'Pago Flash': 'pago_flash',
        'PayPal': 'paypal'
    };
    // Zinli y Wally son Dólares. Transferencia asume Bolívares por defecto.
    const hardCurrencyMethods = [
        "Zelle",
        "Binance",
        "Zinli",
        "WallyTech",
        "Efectivo",
        "PayPal"
    ];

    const activePaymentMethods = useMemo(() => {
        const active = [];
        if (payments.transferencia?.active) active.push("Transferencia");
        if (payments.pago_movil?.active) active.push("Pago Móvil");
        if (payments.zelle?.active) active.push("Zelle");
        if (payments.binance?.active) active.push("Binance");
        if (payments.zinli?.active) active.push("Zinli");
        if (payments.wally?.active) active.push("WallyTech");
        if (payments.cash?.active) active.push("Efectivo");
        if (payments.pago_flash?.active) active.push("Pago Flash");
        if (payments.paypal?.active) active.push("PayPal");
        return active;
    }, [payments]);

    const activeCouriers = useMemo(() => {
        const active = [];
        if (shipping.methods?.mrw) active.push("MRW");
        if (shipping.methods?.zoom) active.push("Zoom");
        if (shipping.methods?.tealca) active.push("Tealca");
        return active;
    }, [shipping]);

    // 🚀 ESTADOS P2P PAGO FLASH (UX MINIMALISTA)
    const [p2pStep, setP2pStep] = useState<'idle' | 'step1' | 'step2'>('idle');
    const [pfTransaction, setPfTransaction] = useState({ pfId: '', orderId: '', orderNumber: 0 });
    const [p2pForm, setP2pForm] = useState({ bankCode: '', phoneCode: '0414', phone: '', reference: '', document: '' });
    const [isVerifying, setIsVerifying] = useState(false);

    // 🚀 NUEVO: Gatillo de Auto-Submit para pasarelas automatizadas
    const [autoSubmitTrigger, setAutoSubmitTrigger] = useState(false);

    // 🚀 MOTOR CONTABLE (STORE CREDIT)
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [availableCredit, setAvailableCredit] = useState<number>(0);
    const [applyCredit, setApplyCredit] = useState<boolean>(false);

    // 🚀 NUEVOS ESTADOS: MOTOR DE VUELTO VIRTUAL Y KYC (OTP EN CALIENTE)
    const [tenderedAmountStr, setTenderedAmountStr] = useState<string>('');
    const [isVirtualChangeAccepted, setIsVirtualChangeAccepted] = useState(false);
    const [changeEmail, setChangeEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [isOtpProcessing, setIsOtpProcessing] = useState(false);



    // 🚀 LÓGICA DE KYC (CONOCE A TU CLIENTE) VÍA OTP
    const handleSendOtp = async () => {
        if (!changeEmail || !changeEmail.includes('@')) {
            return Swal.fire({ title: 'Correo inválido', icon: 'warning', confirmButtonColor: '#000', customClass: { popup: 'rounded-xl' } });
        }
        setIsOtpProcessing(true);
        const { error } = await supabase.auth.signInWithOtp({ email: changeEmail });
        setIsOtpProcessing(false);
        if (error) {
            return Swal.fire({ title: 'Error', text: error.message, icon: 'error', confirmButtonColor: '#000', customClass: { popup: 'rounded-xl' } });
        }
        setOtpSent(true);
    };

    const handleVerifyOtp = async () => {
        if (otpCode.length < 6) return;
        setIsOtpProcessing(true);
        const { data, error } = await supabase.auth.verifyOtp({ email: changeEmail, token: otpCode, type: 'email' });
        setIsOtpProcessing(false);

        if (error) {
            return Swal.fire({ title: 'Código inválido', text: 'Revisa el código e intenta de nuevo.', icon: 'error', confirmButtonColor: '#000', customClass: { popup: 'rounded-xl' } });
        }
        if (data.user) {
            setCurrentUser(data.user);
            setOtpVerified(true);
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Identidad verificada', showConfirmButton: false, timer: 2000, customClass: { popup: 'bg-black text-white rounded-xl text-xs font-bold' } });
        }
    };

    // 🚀 MOTOR 1-CLICK: Carga en paralelo del Saldo y el Perfil del Cliente para autocompletado
    useEffect(() => {
        const fetchProfileAndCredit = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUser(user);
                
                // Consultamos saldo contable y perfil del cliente en paralelo para reducir latencia
                const [creditRes, customerRes] = await Promise.all([
                    supabase.from('store_credits').select('balance_usd').eq('store_id', storeId).eq('customer_id', user.id).maybeSingle(),
                    supabase.from('customers').select('*').eq('id', user.id).maybeSingle()
                ]);

                if (creditRes.data) {
                    setAvailableCredit(Number(creditRes.data.balance_usd));
                }

                if (customerRes.data) {
                    const cust = customerRes.data;
                    const details = cust.shipping_details || {};
                    
                    // Inyección síncrona en el estado del checkout
                    setClientData(prev => ({
                        ...prev,
                        name: cust.full_name || prev.name,
                        phone: cust.phone || prev.phone,
                        identityCard: cust.dni || prev.identityCard,
                        deliveryType: details.deliveryType || prev.deliveryType,
                        courier: details.courier || prev.courier,
                        state: details.state || prev.state,
                        city: details.city || prev.city,
                        addressDetail: details.addressDetail || prev.addressDetail,
                        reference: details.reference || prev.reference,
                    }));

                    // Sincronización del delivery zone si aplica
                    if (details.deliveryZone) {
                        setSelectedDeliveryZone(details.deliveryZone);
                    }
                }
            }
        };
        fetchProfileAndCredit();
    }, [storeId, supabase]);





    // 🚀 HELPER: GENERADOR DE WHATSAPP OMNICANAL (TICKET PREMIUM)
    const generateWaMessage = (orderNum: string | number, isP2P: boolean = false) => {
        // 1. Lógica de Envíos (Intacta)
        let deliveryInfoFull = "Servicio en Local / Experiencia";
        if (needsShipping) {
            if (clientData.deliveryType === "courier") {
                deliveryInfoFull = `${clientData.courier} (Cobro en Destino) - ${clientData.addressDetail}, ${clientData.city}, ${clientData.state}. Ref: ${clientData.reference || "N/A"} | CI: ${clientData.identityCard} | Tlf: ${clientData.phone}`;
            } else if (clientData.deliveryType === "local_delivery") {
                deliveryInfoFull = `Delivery a: ${deliveryZones.find((z: any) => z.id === selectedDeliveryZone)?.name || "Zona"} - ${clientData.addressDetail}, ${clientData.city}. Ref: ${clientData.reference || "N/A"} | Tlf: ${clientData.phone}`;
            } else if (clientData.deliveryType === "pickup") {
                deliveryInfoFull = `Punto de Retiro: ${clientData.addressDetail}`;
            }
        }

        // 🚀 INGENIERÍA VISUAL: Generador de Filas Simétricas (Efecto POS Premium)
        // Calcula el relleno exacto ignorando los caracteres de formato de WhatsApp (* y ~)
        const row = (left: string, right: string, width: number = 28) => {
            const cleanLeft = left.replace(/[\*~]/g, "");
            const cleanRight = right.replace(/[\*~]/g, "");
            const dotsCount = Math.max(2, width - cleanLeft.length - cleanRight.length);
            return `${left} ${".".repeat(dotsCount)} ${right}\n`;
        };

        // 2. Construcción Estructural del Ticket
        let msg = `*TICKET DE ORDEN #${orderNum}*\n`;
        msg += `============================\n\n`;

        msg += `*DATOS DEL CLIENTE*\n`;
        msg += `NOMBRE: ${clientData.name}\n`;
        msg += `CONTACTO: ${clientData.phone}\n\n`;

        msg += `*DETALLE DE COMPRA*\n`;
        cartEngine.processedItems.forEach((item: any) => {
            const pt = item.finalListPrice < item.listPrice
                ? `~($${item.listPrice.toFixed(2)})~ *$${item.finalListPrice.toFixed(2)}*`
                : `*$${item.listPrice.toFixed(2)}*`;

            const itemName = `${item.quantity}x ${item.name}`;

            // Si tiene variante, colocamos el nombre limpio y la variante abajo alineada con el precio
            if (item.variantInfo && item.variantInfo !== 'N/A') {
                msg += `${itemName}\n`;
                msg += row(`  Var: ${item.variantInfo}`, pt);
            } else {
                msg += row(itemName, pt);
            }
        });

        msg += `\n*RESUMEN FINANCIERO*\n`;
        msg += row("SUBTOTAL BASE", `$${cartEngine.totalListNominal.toFixed(2)}`);
        if (cartEngine.listPromoDiscounts > 0) msg += row("DESC. CAMPAÑA", `-$${cartEngine.listPromoDiscounts.toFixed(2)}`);
        if (wholesaleDiscountList > 0) msg += row("DESC. MAYORISTA", `-$${wholesaleDiscountList.toFixed(2)}`);
        if (affiliateDiscountList && affiliateDiscountList > 0) msg += row(`CÓDIGO (${affiliateCode})`, `-$${affiliateDiscountList.toFixed(2)}`);
        if (actualFxSavings > 0) msg += row("BENEFICIO DIVISA", `-$${actualFxSavings.toFixed(2)}`);
        if (applyTax && taxAmountListUSD > 0) msg += row("I.V.A APLICADO", `+$${taxAmountListUSD.toFixed(2)}`);
        if (deliveryCost > 0) msg += row("CARGO DELIVERY", `+$${deliveryCost.toFixed(2)}`);

        // 🚀 APLICACIÓN DE CRÉDITO EN WHATSAPP
        if (applyCredit && availableCredit > 0) {
            const tempTotal = Math.max(0, cartEngine.finalBsModeUSD - totalDiscountsList + deliveryCost + (applyTax ? cartEngine.taxableSubtotalList * (1 - totalDiscountsList / cartEngine.totalListNominal) * (taxPercentage / 100) : 0) - actualFxSavings);
            const applied = Math.min(availableCredit, tempTotal);
            if (applied > 0) msg += row("CRÉDITO APLICADO", `-$${applied.toFixed(2)}`);
        }

        msg += `============================\n`;
        msg += row("*TOTAL FINAL*", `*$${grandTotalUSD.toFixed(2)}*`);
        msg += `\n`;

        if (isP2P) {
            msg += `*MÉTODO DE PAGO*\n`;
            msg += `PAGO FLASH AUTOMATIZADO\n`;
            msg += row("MONTO", `Bs ${grandTotalBs.toLocaleString("es-VE", { maximumFractionDigits: 2 })}`);
            msg += row("REFERENCIA", p2pForm.reference);
            msg += `\n`;
        }

        msg += `*LOGÍSTICA Y ENTREGA*\n`;
        msg += `SERVICIO: ${deliveryInfoFull}\n`;
        if (clientData.notes) msg += `NOTAS: ${clientData.notes}\n`;

        return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    };

    // --- ESTADOS LOGÍSTICOS ---
    const [clientData, setClientData] = useState({
        name: "",
        deliveryType: "pickup",
        courier: "",
        identityCard: "",
        phone: "",
        notes: "",
        state: "",
        city: "",
        addressDetail: "",
        reference: "",
        fiscalAddress: "", // 🚀 NUEVO
    });
    // 🚀 NUEVO: LECTOR DEL PERFIL FISCAL (Gatekeeper de Negocio)
    const fiscalProfile = storeConfig?.fiscal_profile || "informal";
    const isStrictTax =
        fiscalProfile === "ordinary" || fiscalProfile === "special";

    // 🚀 LÓGICA DETERMINISTA: Si es estricto, aplicamos IVA y asumimos 'invoice'.
    // Si no lo es, 0% de IVA y asumimos 'note'. El cliente ya no decide.
    const [documentType, setDocumentType] = useState<"invoice" | "note">(
        isStrictTax ? "invoice" : "note",
    );
    const [applyTax, setApplyTax] = useState<boolean>(isStrictTax);

    // 🚀 NUEVO ESTADO: Para preguntar si el cliente quiere RIF en su factura (Solo visible en modo estricto)
    const [wantsFiscalData, setWantsFiscalData] = useState<boolean>(false);

    // 🚀 NUEVO: Evaluador de Carrito Mixto (O(N) optimizado)
    const needsShipping = useMemo(() => {
        return items.some(item => item.requiresShipping !== false);
    }, [items]);

    const [selectedDeliveryZone, setSelectedDeliveryZone] = useState<string>("");

    const deliveryCost = useMemo(() => {
        if (clientData.deliveryType === "local_delivery" && selectedDeliveryZone) {
            const zone = deliveryZones.find(
                (z: any) => z.id === selectedDeliveryZone,
            );
            return zone ? Number(zone.cost) : 0;
        }
        return 0;
    }, [clientData.deliveryType, selectedDeliveryZone, deliveryZones]);

    // --- MOTOR LIQUID-SPLIT (CON AFILIADOS E IVA) ---
    const taxPercentage = storeConfig?.default_tax_percentage ?? 16;

    const totalDiscountsList =
        wholesaleDiscountList + (affiliateDiscountList || 0);
    const totalDiscountsCash =
        wholesaleDiscountCash + (affiliateDiscountCash || 0);

    const totalListUSD_base = Math.max(
        0,
        cartEngine.finalBsModeUSD - totalDiscountsList + deliveryCost,
    );
    const totalCashUSD_base = Math.max(
        0,
        cartEngine.finalCashModeUSD - totalDiscountsCash + deliveryCost,
    );

    // 🚀 LÓGICA FISCAL ESTRICTA (Base Imponible Proporcional)
    const listDiscountMultiplier =
        cartEngine.totalListNominal > 0
            ? 1 - totalDiscountsList / cartEngine.totalListNominal
            : 1;
    const cashDiscountMultiplier =
        cartEngine.totalCashNominal > 0
            ? 1 - totalDiscountsCash / cartEngine.totalCashNominal
            : 1;

    // Inferimos la base imponible Cash usando la misma proporción que la de Lista
    const taxableRatio =
        cartEngine.totalListNominal > 0
            ? cartEngine.taxableSubtotalList / cartEngine.totalListNominal
            : 0;
    const taxableCashNominal = cartEngine.totalCashNominal * taxableRatio;

    // El IVA se calcula EXCLUSIVAMENTE sobre la porción gravable, nunca sobre el total de la orden
    const taxAmountListUSD = applyTax
        ? cartEngine.taxableSubtotalList *
        listDiscountMultiplier *
        (taxPercentage / 100)
        : 0;
    const taxAmountCashUSD = applyTax
        ? taxableCashNominal * cashDiscountMultiplier * (taxPercentage / 100)
        : 0;

    const totalListUSD = totalListUSD_base + taxAmountListUSD;
    const totalCashUSD = totalCashUSD_base + taxAmountCashUSD;
    const fxMultiplier = totalCashUSD > 0 ? totalListUSD / totalCashUSD : 1;

    // 🚀 RESTAURACIÓN DE LAS VARIABLES DE PAGO MIXTO
    const allowSplitPayments = payments?.allow_split_payments === true;
    const [paymentMode, setPaymentMode] = useState<"single" | "split">("single");

    const [splitPayments, setSplitPayments] = useState<PaymentBlock[]>([]);
    const [activePaymentInput, setActivePaymentInput] = useState<string | null>(
        null,
    );
    const [paymentAmount, setPaymentAmount] = useState<string>("");

    const { paidHardUSD, paidBs, paidListEquivalentUSD, actualFxSavings } =
        useMemo(() => {
            let hard = 0;
            let bs = 0;
            splitPayments.forEach((p) => {
                if (p.isHardCurrency) hard += p.amount;
                else bs += p.amount;
            });
            const listEq = hard * fxMultiplier + bs / activeRate;
            const realUsdPaid = hard + bs / activeRate;
            return {
                paidHardUSD: hard,
                paidBs: bs,
                paidListEquivalentUSD: listEq,
                actualFxSavings: listEq - realUsdPaid,
            };
        }, [splitPayments, fxMultiplier, activeRate]);


    const missingReceipts = splitPayments.some(
        (p) =>
            receiptConfig.strict_mode &&
            p.method !== "Efectivo" &&
            p.method !== "Pago Flash" && // 🚀 EXCLUIMOS PAGO FLASH AQUÍ
            p.method !== "PayPal" && // 🚀 EXCLUIMOS PAYPAL AQUÍ
            !p.receiptFile,
    );

    // 🚀 Alias Dinámicos y Matemática Contable de Crédito
    const exactFxSavings = actualFxSavings;
    const grandTotalUSD_before_credit = Math.max(0, totalListUSD - exactFxSavings);
    const appliedCreditUSD = applyCredit ? Math.min(availableCredit, grandTotalUSD_before_credit) : 0;
    const grandTotalUSD = Math.max(0, grandTotalUSD_before_credit - appliedCreditUSD);
    const grandTotalBs = grandTotalUSD * activeRate;
    const isHardCurrencyPayment = paidHardUSD > 0 || appliedCreditUSD > 0;


    // Recalcular pendientes basándonos en el crédito
    const remainingListUSD = Math.max(0, totalListUSD - paidListEquivalentUSD - appliedCreditUSD);
    const remainingBs = remainingListUSD * activeRate;
    const remainingCashUSD = remainingListUSD / fxMultiplier;
    // Permitimos pagar 100% con saldo a favor
    const isPaidInFull = remainingListUSD <= 0.01 && (splitPayments.length > 0 || appliedCreditUSD >= grandTotalUSD_before_credit - 0.01);

    // --- FUNCIONES DE PAGO ---
    const openPaymentInput = (method: string) => {
        const isHard = hardCurrencyMethods.includes(method);

        if (paymentMode === "single") {
            // 🚀 MODO ÚNICO: Liquida el 100% automáticamente y sobreescribe cualquier selección anterior
            const amount = isHard ? totalCashUSD : totalListUSD * activeRate;
            setSplitPayments([
                {
                    id: `pay-${Date.now()}`,
                    method,
                    amount,
                    currency: isHard ? "usd" : "ves",
                    isHardCurrency: isHard,
                    receiptFile: null,
                },
            ]);
            setActivePaymentInput(method);
        } else {
            // 🚀 MODO MIXTO: Abre el input para ingresar un monto parcial
            setPaymentAmount(
                isHard ? remainingCashUSD.toFixed(2) : remainingBs.toFixed(2),
            );
            setActivePaymentInput(method);
        }
    };

    const confirmPaymentBlock = () => {
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) return;

        const isHard = hardCurrencyMethods.includes(activePaymentInput!);

        // 1. Calculamos el límite exacto según la moneda seleccionada
        const maxAllowed = isHard ? remainingCashUSD : remainingBs;

        // 2. Escudo Anti-Sobrepago (Permitimos 0.01 de tolerancia por redondeos de JavaScript)
        if (amount > maxAllowed + 0.01) {
            Swal.fire({
                title: "Monto Excedido",
                text: `Solo debes ${isHard ? "$" : "Bs"} ${maxAllowed.toFixed(2)}. No puedes ingresar un monto mayor.`,
                icon: "warning",
                confirmButtonColor: "#000",
                customClass: { popup: "rounded-xl" },
            });
            // Auto-completamos el input con el máximo permitido para ayudar al usuario (UX de élite)
            setPaymentAmount(maxAllowed.toFixed(2));
            return;
        }

        setSplitPayments([
            ...splitPayments,
            {
                id: `pay-${Date.now()}`,
                method: activePaymentInput!,
                amount,
                currency: isHard ? "usd" : "ves",
                isHardCurrency: isHard,
                receiptFile: null,
            },
        ]);
        setActivePaymentInput(null);
        setPaymentAmount("");
    };

    const removePaymentBlock = (id: string) =>
        setSplitPayments(splitPayments.filter((p) => p.id !== id));

    const handleAttachReceipt = (id: string, file: File | null) => {
        if (file) {
            // 1. Validar Mime Type real
            if (!file.type.startsWith("image/")) {
                return Swal.fire({
                    title: "Formato inválido",
                    text: "Por seguridad, solo se permiten imágenes (JPG, PNG, WEBP).",
                    icon: "error",
                    confirmButtonColor: "#000",
                });
            }
            // 2. Limitar tamaño máximo a 5MB (Prevención de saturación de memoria)
            if (file.size > 5 * 1024 * 1024) {
                return Swal.fire({
                    title: "Archivo muy pesado",
                    text: "El comprobante no debe superar los 5MB.",
                    icon: "error",
                    confirmButtonColor: "#000",
                });
            }
        }
        setSplitPayments(
            splitPayments.map((p) => (p.id === id ? { ...p, receiptFile: file } : p)),
        );
    };
    // 🚀 ESTÉTICA BRUTALISTA / NEO-EDITORIAL PARA LOS MÉTODOS
    const getPaymentConfig = (pm: string) => {
        const baseSelected =
            "bg-[var(--store-primary)] text-[var(--store-primary-text)] rounded-md transition-all";
        const baseIdle =
            "bg-transparent text-[var(--store-text-main)] border border-[var(--store-border)] hover:border-[var(--store-primary)] rounded-md transition-all";

        switch (pm) {
            case "Transferencia":
                return {
                    icon: BrandLogos.Transferencia,
                    btnSelected: baseSelected,
                    btnIdle: baseIdle,
                };
            case "Pago Móvil":
                return {
                    icon: BrandLogos.PagoMovil,
                    btnSelected: baseSelected,
                    btnIdle: baseIdle,
                };
            case "Zelle":
                return {
                    icon: BrandLogos.Zelle,
                    btnSelected: baseSelected,
                    btnIdle: baseIdle,
                };
            case "Binance":
                return {
                    icon: BrandLogos.Binance,
                    btnSelected: baseSelected,
                    btnIdle: baseIdle,
                };
            case "Zinli":
                return {
                    icon: BrandLogos.Zinli,
                    btnSelected: baseSelected,
                    btnIdle: baseIdle,
                };
            case "WallyTech":
                return {
                    icon: BrandLogos.WallyTech,
                    btnSelected: baseSelected,
                    btnIdle: baseIdle,
                };
            case "Efectivo":
                return {
                    icon: BrandLogos.Efectivo,
                    btnSelected: baseSelected,
                    btnIdle: baseIdle,
                };
            case "PayPal":
                return {
                    icon: BrandLogos.PayPal,
                    btnSelected: baseSelected,
                    btnIdle: baseIdle,
                };
            default:
                return {
                    icon: CreditCard,
                    btnSelected: baseSelected,
                    btnIdle: baseIdle,
                };
        }
    };


    // 🚀 LÓGICA SMART TENDER Y CÁLCULO DE VUELTO (Anclado a la Verdad Absoluta)
    const targetCashAmount = Math.round(Math.max(0, totalCashUSD - appliedCreditUSD) * 100) / 100;
    const targetListAmount = Math.round(Math.max(0, totalListUSD - appliedCreditUSD) * 100) / 100;

    // Parseo a prueba de balas (Soporta comas y puntos)
    const cleanTenderedStr = tenderedAmountStr.replace(',', '.').replace(/[^0-9.]/g, '');
    const tenderedAmount = Math.round((parseFloat(cleanTenderedStr) || 0) * 100) / 100;

    let expectedChange = 0;
    let changeError = '';

    if (tenderedAmount > targetCashAmount) {
        expectedChange = Math.round((tenderedAmount - targetCashAmount) * 100) / 100;
        // 🚀 REGLA DE NEGOCIO: Evitar vueltos absurdos (Límite $100)
        if (expectedChange > 100) {
            changeError = 'El vuelto supera el límite máximo permitido por transacción ($100.00).';
        }
    }

    const getSmartTenderOptions = (total: number) => {
        if (total <= 0) return [];
        const t = Math.round(total * 100) / 100;
        const opts = new Set<number>([t]);

        const bills = [1, 5, 10, 20, 50, 100];
        const nextBill = bills.find(b => b > t);
        if (nextBill) opts.add(nextBill);

        const next20 = Math.ceil(t / 20) * 20;
        if (next20 > t && next20 - t <= 100) opts.add(next20);

        const next50 = Math.ceil(t / 50) * 50;
        if (next50 > t && next50 - t <= 100) opts.add(next50);

        const next100 = Math.ceil(t / 100) * 100;
        if (next100 > t && next100 - t <= 100) opts.add(next100);

        return Array.from(opts).sort((a, b) => a - b).slice(0, 4);
    };
    const smartTenderOptions = getSmartTenderOptions(targetCashAmount);

    // 🚀 CONTROL DE COBERTURA TOTAL DE CRÉDITO (Bypass de pagos)
    const isFullyCoveredByCredit = appliedCreditUSD > 0 && appliedCreditUSD >= grandTotalUSD_before_credit - 0.01;

    // 🚀 EFECTO SENSORIAL: Si el crédito cubre el 100%, limpiamos variables de otros pagos
    useEffect(() => {
        if (isFullyCoveredByCredit) {
            setSplitPayments([]);
            setActivePaymentInput(null);
            setTenderedAmountStr('');
        }
    }, [isFullyCoveredByCredit]);

    // --- PROCESAR ORDEN A BASE DE DATOS (CON LABOR ILLUSION) ---
    const handleCheckout = async () => {
        // 🚀 1. VALIDACIÓN ORGÁNICA (El formulario respira, no regaña)
        const newErrors: Record<string, string> = {};
        if (!clientData.name) newErrors.name = "El nombre es obligatorio";
        if (!clientData.phone) newErrors.phone = "El teléfono es obligatorio";

        if (isStrictTax && wantsFiscalData) {
            if (!clientData.identityCard) newErrors.identityCard = "La Cédula/RIF es obligatoria";
            if (!clientData.fiscalAddress) newErrors.fiscalAddress = "La Dirección Fiscal es obligatoria";
        }

        if (needsShipping) {
            if (clientData.deliveryType === "pickup" && !clientData.addressDetail) newErrors.pickup = "Selecciona un punto de retiro";
            if (clientData.deliveryType === "courier") {
                if (!clientData.courier) newErrors.courier = "Selecciona una agencia";
                if (!clientData.state) newErrors.state = "Requerido";
                if (!clientData.city) newErrors.city = "Requerido";
                if (!clientData.addressDetail) newErrors.addressDetail = "Requerido";
                if (!clientData.identityCard) newErrors.identityCard = "Requerido para envíos";
            }
            if (clientData.deliveryType === "local_delivery" && !selectedDeliveryZone) newErrors.deliveryZone = "Selecciona tu zona";
        }

        // 🚀 NUEVO: Validación orgánica (Permite avanzar si el saldo cubre todo)
        if (splitPayments.length === 0 && appliedCreditUSD === 0) {
            newErrors.payment = "Selecciona un método de pago";
        }

        // 🚀 CANDADO LEGAL: VUELTO VIRTUAL Y KYC
        if (activePaymentInput === 'Efectivo' && paymentMode === 'single') {
            if (tenderedAmount < targetCashAmount) {
                newErrors.tendered = "El monto entregado es menor al total a pagar.";
            } else if (changeError) {
                newErrors.tendered = changeError;
            } else if (expectedChange > 0) {
                if (!isVirtualChangeAccepted) {
                    newErrors.virtualChange = "Debes aceptar los términos del vuelto virtual.";
                }
                if (isVirtualChangeAccepted && !currentUser && !otpVerified) {
                    newErrors.otp = "Verifica tu identidad con OTP para proteger tu saldo a favor.";
                }
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);

            const firstErrorKey = Object.keys(newErrors)[0];
            const errorElement = document.getElementById(`field-${firstErrorKey}`);

            if (errorElement) {
                // Si el elemento existe, hacemos el scroll suave
                errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                // FALLBACK VITAL: Si el DOM falla, mostramos alerta nativa
                Swal.fire({
                    title: "Faltan datos",
                    text: "Por favor, revisa que todos los campos requeridos marcados en rojo estén completos.",
                    icon: "warning",
                    confirmButtonColor: "#000",
                    customClass: { popup: "rounded-xl" }
                });
            }
            return;
        }

        setErrors({}); // Limpiamos errores
        if (!isPaidInFull) return Swal.fire({ title: "Saldo Pendiente", text: "Debes completar el 100% del pago.", icon: "warning", confirmButtonColor: "#000", customClass: { popup: "rounded-xl" } });
        if (missingReceipts) return Swal.fire({ title: "Comprobantes Faltantes", text: "Adjunta los captures de pago.", icon: "warning", confirmButtonColor: "#000", customClass: { popup: "rounded-xl" } });

        // 🚀 2. LA ILUSIÓN DE BÓVEDA (LABOR ILLUSION)
        setCheckoutState('validating');
        await new Promise(resolve => setTimeout(resolve, 800)); // Retenemos al cliente para darle seguridad psicológica
        setCheckoutState('processing');

        try {
            // ... 1. Upload Paralelo con Prevención de Colisiones (Intacto)
            const uploadedPayments = await Promise.all(
                splitPayments.map(async (p) => {
                    let receiptPublicUrl = null;
                    if (p.receiptFile) {
                        let compressedReceipt = await compressImage(p.receiptFile, 800, 0.7);
                        const fileExt = p.receiptFile.name.split(".").pop() || "jpg";
                        const fileName = `receipt-${p.id}-${Date.now().toString().slice(-6)}.${fileExt}`;
                        const { error: uploadError } = await supabase.storage.from("receipts").upload(fileName, compressedReceipt, { upsert: true });
                        if (uploadError) throw new Error("Problema al subir el comprobante. Verifica tu internet.");
                        const { data: { publicUrl } } = supabase.storage.from("receipts").getPublicUrl(fileName);
                        receiptPublicUrl = publicUrl;
                    }
                    return {
                        method: p.method,
                        amount_usd: p.currency === "usd" ? p.amount : Number((p.amount / activeRate).toFixed(2)),
                        amount_bs: p.currency === "ves" ? p.amount : Number((p.amount * activeRate).toFixed(2)),
                        currency: p.currency,
                        receipt_url: p.receipt_url || receiptPublicUrl,
                    };
                }),
            );

            // 🚀 RESOLUCIÓN DE LOGÍSTICA (Intacta)
            let deliveryInfoFull = "Servicio en Local / Experiencia";
            let finalShippingMethod = "service";

            if (needsShipping) {
                finalShippingMethod = clientData.deliveryType;
                if (clientData.deliveryType === "courier") deliveryInfoFull = `${clientData.courier} (Cobro en Destino) - ${clientData.addressDetail}, ${clientData.city}, ${clientData.state}. Ref: ${clientData.reference || "N/A"} | CI: ${clientData.identityCard} | Tlf: ${clientData.phone}`;
                else if (clientData.deliveryType === "local_delivery") deliveryInfoFull = `Delivery a: ${deliveryZones.find((z: any) => z.id === selectedDeliveryZone)?.name || "Zona"} - ${clientData.addressDetail}, ${clientData.city}. Ref: ${clientData.reference || "N/A"} | Tlf: ${clientData.phone}`;
                else if (clientData.deliveryType === "pickup") deliveryInfoFull = `Punto de Retiro: ${clientData.addressDetail}`;
            }


            // 🚀 INYECTAR CRÉDITO DE TIENDA COMO PAGO MIXTO
            if (appliedCreditUSD > 0) {
                uploadedPayments.push({
                    method: "Crédito de Tienda",
                    amount_usd: appliedCreditUSD,
                    amount_bs: appliedCreditUSD * activeRate,
                    currency: "usd",
                    receipt_url: "Vuelto Virtual (Sistema)"
                });
            }
            const finalPaymentMethod = uploadedPayments.length === 1 ? uploadedPayments[0].method : "Mixto";
            const isAutomatedGateway = finalPaymentMethod === "Pago Flash";
            let order: any;

            if (isAutomatedGateway) {
                const initRes = await fetch('/api/checkout/pago-flash/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        storeId, clientData,
                        orderData: { total_usd: Number(grandTotalUSD.toFixed(2)), total_bs: Number(grandTotalBs.toFixed(2)), exchange_rate: activeRate, currency_type: currency, shipping_method: finalShippingMethod, delivery_info: deliveryInfoFull },
                        items: items.map(item => ({ productId: item.productId, name: item.name, quantity: item.quantity, basePrice: item.basePrice }))
                    })
                });

                const initData = await initRes.json();
                if (!initRes.ok || !initData.success) throw new Error(initData.error || 'Fallo al iniciar el pago.');

                setPfTransaction({ pfId: initData.pf_transaction_id, orderId: initData.order_id, orderNumber: initData.order_number || 0 });
                setP2pStep('step1');
                setCheckoutState('idle'); // Revertimos porque abre un modal
                return;

            }




            else {
                // 🚀 INYECCIÓN PARA EL COMERCIANTE EN BD (Detalle exacto de billetes)
                if (expectedChange > 0 && isVirtualChangeAccepted) {
                    const userEmail = changeEmail || currentUser?.email || 'No provisto';
                    deliveryInfoFull += ` | ⚠️ VUELTO VIRTUAL: $${expectedChange.toFixed(2)} (Entregó: $${tenderedAmount.toFixed(2)} | Correo: ${userEmail})`;
                }
                const { data: insertedOrder, error: orderError } = await supabase
                    .from("orders")
                    .insert({
                        store_id: storeId, customer_id: currentUser ? currentUser.id : null, customer_name: clientData.name, customer_phone: clientData.phone, total_usd: Number(grandTotalUSD.toFixed(2)), total_bs: Number(grandTotalBs.toFixed(2)), exchange_rate: activeRate, currency_type: currency, status: "pending", payment_method: finalPaymentMethod, split_payments: uploadedPayments, shipping_method: finalShippingMethod, delivery_info: deliveryInfoFull, shipping_cost: Number(deliveryCost.toFixed(2)), discount_amount: Number((wholesaleDiscountList + cartEngine.listPromoDiscounts + (affiliateDiscountList || 0)).toFixed(2)), affiliate_code: affiliateCode || null, document_type: isStrictTax ? "invoice" : "note", is_tax_applied: applyTax, tax_percentage: applyTax ? taxPercentage : 0, subtotal_usd: Number(totalListUSD_base.toFixed(2)), tax_amount_usd: Number(taxAmountListUSD.toFixed(2)), promo_discount_usd: Number(cartEngine.listPromoDiscounts.toFixed(2)), wholesale_discount_usd: Number(wholesaleDiscountList.toFixed(2)), affiliate_discount_usd: Number((affiliateDiscountList || 0).toFixed(2)), fx_savings_usd: Number(actualFxSavings.toFixed(2)), customer_dni: (isStrictTax && wantsFiscalData) || clientData.deliveryType === "courier" ? clientData.identityCard : null, customer_address: isStrictTax && wantsFiscalData ? clientData.fiscalAddress : null,
                    }).select().single();

                if (orderError) throw new Error("Interrupción de red al registrar pedido. Reintenta.");
                order = insertedOrder;
            }

            const orderItemsPayload = items.map((item) => ({
                order_id: order.id, product_id: item.productId, product_name: item.name, variant_info: item.variantInfo || "N/A", quantity: item.quantity, price_at_purchase: item.basePrice, variant_id: item.variantId && item.variantId.length === 36 ? item.variantId : null,
            }));

            const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload);

            if (itemsError) {
                // 🚀 FAIL-FORWARD: Rescate de venta
                let fallbackMessage = `*ALERTA DE PEDIDO INCOMPLETO (Fallo de Red)* ⚠️\n------------------------\n*Intento de Pedido:* #${order.order_number}\n*Cliente:* ${clientData.name}\n*Teléfono:* ${clientData.phone}\n\nHola, la página tuvo un corte de red al intentar guardar los productos de mi carrito, pero mi registro de pago se envió por un total de *$${grandTotalUSD.toFixed(2)}*. Por favor verifica en tu panel el pedido #${order.order_number} y confirmemos los productos por aquí.`;
                const fallbackWaLink = `https://wa.me/${phone}?text=${encodeURIComponent(fallbackMessage)}`;
                clearCart();
                setCheckoutState('success');
                setTimeout(() => onSuccess(order.order_number, fallbackWaLink, order.id), 600);
                return;
            }

            // Web Push Silencioso
            await fetch("/api/web-push/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId, orderNumber: order.order_number, totalUsd: grandTotalUSD.toFixed(2), customerName: clientData.name }) }).catch(() => { });

            // Generar WhatsApp (Intacto)
            let message = `*PEDIDO #${order.order_number}*\n------------------------\n*Cliente:* ${clientData.name}\n*Teléfono:* ${clientData.phone}\n\n*CARRITO:*\n`;
            cartEngine.processedItems.forEach((item: any) => {
                const priceText = item.finalListPrice < item.listPrice ? `~($${item.listPrice.toFixed(2)})~ *$${item.finalListPrice.toFixed(2)}*` : `($${item.listPrice.toFixed(2)})`;
                message += `🔸 ${item.quantity}x ${item.name} ${item.variantInfo ? `(${item.variantInfo})` : ""} ${priceText}\n`;
            });
            message += `\n*RESUMEN FINANCIERO:*\nSubtotal Base: $${cartEngine.totalListNominal.toFixed(2)}\n`;
            if (cartEngine.listPromoDiscounts > 0) message += `Desc. Campaña: -$${cartEngine.listPromoDiscounts.toFixed(2)}\n`;
            if (wholesaleDiscountList > 0) message += `Desc. Mayorista: -$${wholesaleDiscountList.toFixed(2)}\n`;
            if (affiliateDiscountList! > 0) message += `Desc. Código (${affiliateCode}): -$${affiliateDiscountList!.toFixed(2)}\n`;
            if (actualFxSavings > 0) message += `Beneficio Divisa: -$${actualFxSavings.toFixed(2)}\n`;
            if (applyTax && taxAmountListUSD > 0) message += `I.V.A (${taxPercentage}%): +$${taxAmountListUSD.toFixed(2)}\n`;
            if (deliveryCost > 0) message += `Delivery: +$${deliveryCost.toFixed(2)}\n`;
            if (appliedCreditUSD > 0) message += `Crédito de Tienda: -$${appliedCreditUSD.toFixed(2)}\n`;
            // 🚀 EL CONTRATO LEGAL EN WHATSAPP
            if (expectedChange > 0 && isVirtualChangeAccepted) {
                message += `\n*🧾 ACUERDO DE VUELTO VIRTUAL*\n`;
                message += `Entregado en Billetes: $${tenderedAmount.toFixed(2)}\n`;
                message += `Vuelto Pendiente: $${expectedChange.toFixed(2)}\n`;
                message += `_Este vuelto ha sido transformado en Crédito de Tienda no caducable bajo su consentimiento explícito. Consúltelo en su perfil de Preziso Passport tras la entrega._\n`;
            }
            message += `------------------------\n*TOTAL FINAL APLICADO: $${grandTotalUSD.toFixed(2)}*\n`;
            message += uploadedPayments.length > 1 ? `\n*PAGOS (MIXTO):*\n` : `\n*MÉTODO DE PAGO:*\n`;
            uploadedPayments.forEach((p: any) => {
                message += `✔️ ${p.method}: ${p.currency === "usd" ? "$" + p.amount_usd.toFixed(2) : "Bs " + p.amount_bs.toLocaleString("es-VE", { maximumFractionDigits: 2 })}\n`;
                if (p.receipt_url) message += `   🔗 Comprobante: ${p.receipt_url}\n`;
            });
            message += `\n*LOGÍSTICA:*\nEnvío: ${deliveryInfoFull}\n`;
            if (clientData.notes) message += `Notas: ${clientData.notes}\n`;

            const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

            // 🚀 MUTACIÓN ATÓMICA DEL SALDO A FAVOR (Corregido sin encadenar .catch)
            if (appliedCreditUSD > 0 && currentUser && !isAutomatedGateway) {
                const { error: rpcError } = await supabase.rpc('process_store_credit', {
                    p_customer_id: currentUser.id,
                    p_store_id: storeId,
                    p_amount_usd: -appliedCreditUSD, // NEGATIVO para restar
                    p_description: `Usado en orden #${order.order_number}`,
                    p_order_id: order.id
                });

                if (rpcError) {
                    console.error('Error descontando saldo (RPC):', rpcError);
                }
            }

            clearCart();

            // 🚀 3. CONFIRMACIÓN FINAL SENSORIAL (Check verde en el botón)
            setCheckoutState('success');
            // 🚀 HÁPTICA: Doble pulso clásico de éxito (Corto, Pausa, Corto)
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([20, 50, 20]);

            setTimeout(() => {
                onSuccess(order.order_number, waLink, order.id);
            }, 600);

        } catch (error: any) {
            setCheckoutState('idle'); // Restablecemos el botón
            Swal.fire({ title: "Falla de Conexión", text: error.message, icon: "info", iconColor: "#000", confirmButtonColor: "#000", customClass: { popup: "rounded-xl border border-[var(--store-border)]" } });
        }
    };

    // 🚀 MOTOR VERIFICADOR P2P
    const handleVerifyP2P = async () => {
        if (!p2pForm.bankCode || !p2pForm.phone || !p2pForm.reference || !p2pForm.document) {
            return Swal.fire({ title: 'Faltan Datos', text: 'Completa todos los campos para verificar.', icon: 'warning', confirmButtonColor: '#000' });
        }

        setIsVerifying(true);
        try {
            const verifyRes = await fetch('/api/checkout/pago-flash/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId, orderId: pfTransaction.orderId, pfTransactionId: pfTransaction.pfId, amount: Number(grandTotalUSD.toFixed(2)), p2pData: p2pForm
                })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) throw new Error(verifyData.error || 'No pudimos validar tu pago. Verifica la referencia.');


            // ÉXITO ABSOLUTO (Corregido sin encadenar .catch)
            if (appliedCreditUSD > 0 && currentUser) {
                const { error: rpcError } = await supabase.rpc('process_store_credit', {
                    p_customer_id: currentUser.id,
                    p_store_id: storeId,
                    p_amount_usd: -appliedCreditUSD,
                    p_description: `Usado en orden #${pfTransaction.orderNumber} (Pago Flash)`,
                    p_order_id: pfTransaction.orderId
                });

                if (rpcError) {
                    console.error('Error descontando saldo en P2P (RPC):', rpcError);
                }
            }
            clearCart();
            const waLink = generateWaMessage(pfTransaction.orderNumber, true);
            onSuccess(pfTransaction.orderNumber, waLink, pfTransaction.orderId);

        } catch (error: any) {
            // Mantiene el modal en Paso 2 para que corrija el error
            Swal.fire({ title: 'Validación Rechazada', text: error.message, icon: 'error', confirmButtonColor: '#000' });
        } finally {
            setIsVerifying(false);
        }
    };

    // 🚀 MOTOR DE AUTO-CHECKOUT
    useEffect(() => {
        if (autoSubmitTrigger) {
            // Si el pago se cubrió por completo y no faltan captures de otros métodos
            if (isPaidInFull && !missingReceipts) {
                handleCheckout();
            } else {
                // Si es un pago mixto y aún debe dinero, solo le avisamos
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, customClass: { popup: 'bg-black text-white rounded-xl text-xs font-bold' } });
                Toast.fire({ icon: 'success', title: 'Abono validado. Completa el resto.' });
            }
            setAutoSubmitTrigger(false); // Reseteamos el gatillo
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoSubmitTrigger, isPaidInFull, missingReceipts]);


    const stepVariants = {
        hidden: { opacity: 0, x: 20 },
        enter: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
    };

    return (
        <motion.div
            key="step-2"
            variants={stepVariants}
            initial="hidden"
            animate="enter"
            exit="exit"
            className="flex flex-col h-full w-full overflow-hidden bg-[var(--store-surface)]"
        >
            <div className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth relative no-scrollbar px-6 md:px-10 py-8 space-y-12 pb-16">
                <div id="field-name" className="w-full">
                    <input
                        maxLength={50}
                        value={clientData.name}
                        onChange={(e) => {
                            setClientData({ ...clientData, name: e.target.value.replace(/[<>]/g, "") });
                            // 🚀 Limpieza en tiempo real
                            if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
                        }}
                        className={`w-full bg-transparent border-0 border-b py-3 text-base font-bold outline-none focus:ring-0 focus:shadow-none transition-colors rounded-none placeholder:text-[var(--store-surface-text)] ${errors.name ? 'border-red-500 text-red-600 focus:border-red-500' : 'border-[var(--store-border)] text-[var(--store-text-main)] focus:border-[var(--store-primary)]'}`}
                        placeholder="Nombre completo *"
                    />
                    <AnimatePresence>
                        {errors.name && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.name}</motion.p>}
                    </AnimatePresence>
                </div>

                <div id="field-phone" className="w-full">
                    <input
                        maxLength={20}
                        value={clientData.phone}
                        onChange={(e) => {
                            setClientData({ ...clientData, phone: e.target.value.replace(/[^\d+]/g, "") });
                            // 🚀 Limpieza en tiempo real
                            if (errors.phone) setErrors(prev => ({ ...prev, phone: "" }));
                        }}
                        className={`w-full bg-transparent border-0 border-b py-3 text-base font-bold outline-none focus:ring-0 focus:shadow-none transition-colors rounded-none placeholder:text-[var(--store-surface-text)] ${errors.phone ? 'border-red-500 text-red-600 focus:border-red-500' : 'border-[var(--store-border)] text-[var(--store-text-main)] focus:border-[var(--store-primary)]'}`}
                        placeholder="Teléfono / WhatsApp *"
                    />
                    <AnimatePresence>
                        {errors.phone && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.phone}</motion.p>}
                    </AnimatePresence>
                </div>

                {/* 🚀 LÓGICA FISCAL DETERMINISTA (UX Limpia) */}
                <div className="mt-6 pt-6 border-t border-[var(--store-border)]">
                    {isStrictTax ? (
                        // 🟢 MODO CORPORATIVO: Ordinario / Especial
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-4 bg-[var(--store-bg)] rounded-xl border border-[var(--store-border)]">
                                <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-[var(--store-primary)] flex items-center justify-center shrink-0">
                                    <div className="w-2 h-2 rounded-full bg-[var(--store-primary)]" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-[var(--store-text-main)] uppercase tracking-widest leading-none mb-1">
                                        Impuesto de Ley Aplicado
                                    </p>
                                    <p className="text-[10px] font-medium text-[var(--store-surface-text)] leading-relaxed">
                                        Por normativa del SENIAT, esta orden incluye el cálculo del{" "}
                                        {taxPercentage}% de I.V.A.
                                    </p>
                                </div>
                            </div>

                            <label className="flex items-center gap-3 p-4 border border-[var(--store-border)] rounded-xl cursor-pointer hover:bg-[var(--store-bg)] transition-colors group">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 accent-[var(--store-primary)] border-[var(--store-border)] rounded shadow-sm focus:ring-0 cursor-pointer"
                                    checked={wantsFiscalData}
                                    onChange={(e) => setWantsFiscalData(e.target.checked)}
                                />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-[var(--store-text-main)] transition-colors group-hover:text-[var(--store-primary)]">
                                        Deseo comprobante con mis datos fiscales (RIF)
                                    </span>
                                    <span className="text-[10px] text-[var(--store-surface-text)] font-medium">
                                        Si no lo seleccionas, se emitirá a Consumidor Final.
                                    </span>
                                </div>
                            </label>

                            <AnimatePresence>
                                {wantsFiscalData && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pt-2 space-y-4">
                                            <div id="field-identityCard" className="w-full relative">
                                                <input
                                                    maxLength={20}
                                                    value={clientData.identityCard}
                                                    onChange={(e) => {
                                                        setClientData({
                                                            ...clientData,
                                                            identityCard: e.target.value.replace(/[^JVEG0-9-]/gi, "").toUpperCase(),
                                                        });
                                                        if (errors.identityCard) setErrors(prev => ({ ...prev, identityCard: "" }));
                                                    }}
                                                    className={`w-full bg-transparent border-0 border-b py-3 text-base font-bold outline-none focus:ring-0 transition-colors rounded-none placeholder:text-[var(--store-surface-text)] ${errors.identityCard ? 'border-red-500 text-red-600 focus:border-red-500' : 'border-[var(--store-border)] text-[var(--store-text-main)] focus:border-[var(--store-primary)]'}`}
                                                    placeholder="Ej: J-12345678-9 *"
                                                />
                                                <AnimatePresence>
                                                    {errors.identityCard && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.identityCard}</motion.p>}
                                                </AnimatePresence>
                                            </div>

                                            <div id="field-fiscalAddress" className="w-full relative">
                                                <input
                                                    maxLength={100}
                                                    value={clientData.fiscalAddress}
                                                    onChange={(e) => {
                                                        setClientData({ ...clientData, fiscalAddress: e.target.value });
                                                        if (errors.fiscalAddress) setErrors(prev => ({ ...prev, fiscalAddress: "" }));
                                                    }}
                                                    className={`w-full bg-transparent border-0 border-b py-3 text-base font-bold outline-none focus:ring-0 transition-colors rounded-none placeholder:text-[var(--store-surface-text)] ${errors.fiscalAddress ? 'border-red-500 text-red-600 focus:border-red-500' : 'border-[var(--store-border)] text-[var(--store-text-main)] focus:border-[var(--store-primary)]'}`}
                                                    placeholder="Dirección Fiscal Completa *"
                                                />
                                                <AnimatePresence>
                                                    {errors.fiscalAddress && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.fiscalAddress}</motion.p>}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        // 🔴 MODO INFORMAL: Emprendedor
                        // No mostramos nada relacionado al IVA, la orden sigue limpia.
                        <div className="hidden"></div>
                    )}
                </div>

                {/* 🚀 LOGÍSTICA DE ENVÍO (Estructural & Condicional) */}
                {needsShipping ? (
                    <div className="space-y-6">
                        <h2 className="text-[10px] font-black text-[var(--store-surface-text)] uppercase tracking-widest border-b border-[var(--store-border)] pb-3">
                            Entrega
                        </h2>
                        {/* 🚀 TARJETAS TÁCTILES (Radio Cards con Checkmark Animado) */}
                        <div className="grid grid-cols-1 gap-3" id="field-deliveryType">
                            {shipping.methods?.pickup && (
                                <div
                                    onClick={() => {
                                        setClientData({
                                            ...clientData,
                                            deliveryType: "pickup",
                                            addressDetail: "",
                                        });
                                        setSelectedDeliveryZone("");
                                        // 🚀 EXORCISMO DE FANTASMAS: Limpiamos errores de otras pestañas
                                        setErrors(prev => ({ ...prev, pickup: "", courier: "", deliveryZone: "", addressDetail: "", city: "", state: "" }));
                                    }}
                                    className={`relative cursor-pointer p-5 rounded-md transition-all flex items-start gap-4 border ${clientData.deliveryType === "pickup" ? "border-[var(--store-primary)] ring-[var(--store-primary)] ring-1 bg-[var(--store-bg)]" : "border-[var(--store-border)] hover:border-[var(--store-border)]"}`}
                                >
                                    {/* 🚀 TACTILE CHECKMARK POP */}
                                    <AnimatePresence>
                                        {clientData.deliveryType === "pickup" && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 15 }} className="absolute -top-2 -right-2 bg-[var(--store-primary)] text-[var(--store-primary-text)] rounded-full p-1 shadow-md z-10">
                                                <Check size={12} strokeWidth={3} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <Store
                                        size={20}
                                        className={clientData.deliveryType === "pickup" ? "text-[var(--store-text-main)]" : "text-[var(--store-surface-text)]"}
                                    />
                                    <div>
                                        <p className="font-bold text-sm text-[var(--store-text-main)]">Retiro Personal</p>
                                        <p className="text-xs mt-0.5 text-[var(--store-surface-text)]">Busca tu pedido gratis en tienda.</p>
                                    </div>
                                </div>
                            )}

                            {shipping.methods?.delivery && deliveryZones.length > 0 && (
                                <div
                                    onClick={() => {
                                        setClientData({
                                            ...clientData,
                                            deliveryType: "local_delivery",
                                            addressDetail: "",
                                        });
                                        // 🚀 EXORCISMO DE FANTASMAS
                                        setErrors(prev => ({ ...prev, pickup: "", courier: "", deliveryZone: "", addressDetail: "", city: "", state: "" }));
                                    }}
                                    className={`relative cursor-pointer p-5 rounded-md transition-all flex items-start gap-4 border ${clientData.deliveryType === "local_delivery" ? "border-[var(--store-primary)] ring-[var(--store-primary)] ring-1 bg-[var(--store-bg)]" : "border-[var(--store-border)] hover:border-[var(--store-border)]"}`}
                                >
                                    {/* 🚀 TACTILE CHECKMARK POP */}
                                    <AnimatePresence>
                                        {clientData.deliveryType === "local_delivery" && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 15 }} className="absolute -top-2 -right-2 bg-[var(--store-primary)] text-[var(--store-primary-text)] rounded-full p-1 shadow-md z-10">
                                                <Check size={12} strokeWidth={3} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <Truck
                                        size={20}
                                        className={clientData.deliveryType === "local_delivery" ? "text-[var(--store-text-main)]" : "text-[var(--store-surface-text)]"}
                                    />
                                    <div>
                                        <p className="font-bold text-sm text-[var(--store-text-main)]">Delivery Local</p>
                                        <p className="text-xs mt-0.5 text-[var(--store-surface-text)]">Entregas a domicilio.</p>
                                    </div>
                                </div>
                            )}

                            {(shipping.methods?.mrw || shipping.methods?.zoom || shipping.methods?.tealca) && (
                                <div
                                    onClick={() => {
                                        setClientData({
                                            ...clientData,
                                            deliveryType: "courier",
                                            addressDetail: "",
                                        });
                                        setSelectedDeliveryZone("");
                                        // 🚀 EXORCISMO DE FANTASMAS
                                        setErrors(prev => ({ ...prev, pickup: "", courier: "", deliveryZone: "", addressDetail: "", city: "", state: "" }));
                                    }}
                                    className={`relative cursor-pointer p-5 rounded-md transition-all flex items-start gap-4 border ${clientData.deliveryType === "courier" ? "border-[var(--store-primary)] ring-[var(--store-primary)] ring-1 bg-[var(--store-bg)]" : "border-[var(--store-border)] hover:border-[var(--store-border)]"}`}
                                >
                                    {/* 🚀 TACTILE CHECKMARK POP */}
                                    <AnimatePresence>
                                        {clientData.deliveryType === "courier" && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 15 }} className="absolute -top-2 -right-2 bg-[var(--store-primary)] text-[var(--store-primary-text)] rounded-full p-1 shadow-md z-10">
                                                <Check size={12} strokeWidth={3} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <Package
                                        size={20}
                                        className={clientData.deliveryType === "courier" ? "text-[var(--store-text-main)]" : "text-[var(--store-surface-text)]"}
                                    />
                                    <div>
                                        <p className="font-bold text-sm text-[var(--store-text-main)]">Envío Nacional</p>
                                        <p className="text-xs mt-0.5 text-[var(--store-surface-text)]">Envíos por agencia.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sub-opciones de Logística (Naked Inputs) */}
                        {clientData.deliveryType === "pickup" && (
                            <div id="field-pickup" className="space-y-3 animate-in fade-in slide-in-from-top-2 pt-4">
                                <div>
                                    <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${errors.pickup ? 'text-red-500' : 'text-[var(--store-surface-text)]'}`}>
                                        ¿Dónde lo buscas? *
                                    </label>
                                    <AnimatePresence>
                                        {errors.pickup && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-[10px] font-bold mb-4 px-1">{errors.pickup}</motion.p>}
                                    </AnimatePresence>
                                </div>
                                <div className={`grid gap-3 p-1 rounded-lg transition-colors ${errors.pickup ? 'bg-red-50/30 ring-1 ring-red-500/50' : ''}`}>
                                    {shipping.main_address && (
                                        <label
                                            className={`flex items-start gap-3 p-4 rounded-md cursor-pointer transition-all border ${clientData.addressDetail === shipping.main_address ? "border-[var(--store-primary)] ring-[var(--store-primary)] ring-1 bg-[var(--store-bg)]" : "border-[var(--store-border)] hover:border-[var(--store-border)]"}`}
                                        >
                                            <input
                                                type="radio"
                                                name="pickupLocation"
                                                className="mt-0.5 accent-[var(--store-primary)] w-4 h-4 border-0 border-b border-[var(--store-border)] py-3 text-base font-bold text-[var(--store-text-main)] outline-none focus:ring-0 focus:shadow-none focus:border-[var(--store-primary)] transition-colors rounded-none placeholder:text-[var(--store-surface-text)]"
                                                checked={
                                                    clientData.addressDetail === shipping.main_address
                                                }
                                                onChange={() => {
                                                    setClientData({
                                                        ...clientData,
                                                        addressDetail: shipping.main_address,
                                                    });
                                                    // 🚀 Limpieza instantánea al seleccionar
                                                    if (errors.pickup) setErrors(prev => ({ ...prev, pickup: "" }));
                                                }}
                                            />
                                            <div>
                                                <p className="font-bold text-sm text-[var(--store-text-main)] leading-none">
                                                    Tienda Física
                                                </p>
                                                <p className="text-xs text-[var(--store-surface-text)] mt-1.5">
                                                    {shipping.main_address}
                                                </p>
                                            </div>
                                        </label>
                                    )}
                                    {shipping.pickup_locations?.map((loc: string, idx: number) => (
                                        <label
                                            key={idx}
                                            className={`flex items-start gap-3 p-4 rounded-md cursor-pointer transition-all border ${clientData.addressDetail === loc ? "border-[var(--store-primary)] ring-[var(--store-primary)] ring-1 bg-[var(--store-bg)]" : "border-[var(--store-border)] hover:border-[var(--store-border)]"}`}
                                        >
                                            <input
                                                type="radio"
                                                name="pickupLocation"
                                                className="mt-0.5 accent-[var(--store-primary)] w-4 h-4 border-0 border-b border-[var(--store-border)] py-3 text-base font-bold text-[var(--store-text-main)] outline-none focus:ring-0 focus:shadow-none focus:border-[var(--store-primary)] transition-colors rounded-none placeholder:text-[var(--store-surface-text)]"
                                                checked={clientData.addressDetail === loc}
                                                onChange={() => {
                                                    setClientData({ ...clientData, addressDetail: loc });
                                                    // 🚀 Limpieza instantánea al seleccionar
                                                    if (errors.pickup) setErrors(prev => ({ ...prev, pickup: "" }));
                                                }}
                                            />
                                            <div>
                                                <p className="font-bold text-sm text-[var(--store-text-main)] leading-none">
                                                    Punto de Entrega
                                                </p>
                                                <p className="text-xs text-[var(--store-surface-text)] mt-1.5">
                                                    {loc}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                    {shipping.pickup_locations?.map((loc: string, idx: number) => (
                                        <label
                                            key={idx}
                                            className={`flex items-start gap-3 p-4 rounded-md cursor-pointer transition-all border ${clientData.addressDetail === loc ? "border-[var(--store-primary)] ring-[var(--store-primary)] ring-1 bg-[var(--store-bg)]" : "border-[var(--store-border)] hover:border-[var(--store-border)]"}`}
                                        >
                                            <input
                                                type="radio"
                                                name="pickupLocation"
                                                className="mt-0.5 accent-[var(--store-primary)] w-4 h-4 border-0 border-b border-[var(--store-border)] py-3 text-base font-bold text-[var(--store-text-main)] outline-none focus:ring-0 focus:shadow-none focus:border-[var(--store-primary)] transition-colors rounded-none placeholder:text-[var(--store-surface-text)]"
                                                checked={clientData.addressDetail === loc}
                                                onChange={() =>
                                                    setClientData({ ...clientData, addressDetail: loc })
                                                }
                                            />
                                            <div>
                                                <p className="font-bold text-sm text-[var(--store-text-main)] leading-none">
                                                    Punto de Entrega
                                                </p>
                                                <p className="text-xs text-[var(--store-surface-text)] mt-1.5">
                                                    {loc}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {clientData.deliveryType === "local_delivery" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 pt-4">
                                <div id="field-deliveryZone">
                                    <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${errors.deliveryZone ? 'text-red-500' : 'text-[var(--store-surface-text)]'}`}>
                                        Selecciona tu zona *
                                    </label>
                                    <AnimatePresence>
                                        {errors.deliveryZone && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-[10px] font-bold mb-4 px-1">{errors.deliveryZone}</motion.p>}
                                    </AnimatePresence>

                                    <div className="grid grid-cols-1 gap-3">
                                        {deliveryZones.map((z: any) => (
                                            <button
                                                key={z.id}
                                                onClick={() => {
                                                    setSelectedDeliveryZone(z.id);
                                                    if (errors.deliveryZone) setErrors(prev => ({ ...prev, deliveryZone: "" }));
                                                }}
                                                className={`flex justify-between items-center px-5 py-4 rounded-md transition-all border ${selectedDeliveryZone === z.id ? "border-[var(--store-primary)] ring-[var(--store-primary)] ring-1 bg-[var(--store-bg)] text-[var(--store-text-main)]" : "border-[var(--store-border)] text-[var(--store-surface-text)] hover:border-[var(--store-border)]"} ${errors.deliveryZone && !selectedDeliveryZone ? 'border-red-500/50 bg-red-50/10' : ''}`}
                                            >
                                                <span className="font-bold text-sm">{z.name}</span>
                                                <span className="font-black text-sm">
                                                    +{currencySymbol}{Number(z.cost).toFixed(2)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {selectedDeliveryZone && (
                                    <div className="grid grid-cols-1 gap-6 animate-in fade-in pt-2">
                                        <div id="field-addressDetail" className="w-full relative">
                                            <input
                                                value={clientData.addressDetail}
                                                onChange={(e) => {
                                                    setClientData({ ...clientData, addressDetail: e.target.value });
                                                    if (errors.addressDetail) setErrors(prev => ({ ...prev, addressDetail: "" }));
                                                }}
                                                className={`w-full bg-transparent border-0 border-b py-3 text-base font-bold outline-none focus:ring-0 transition-colors rounded-none placeholder:text-[var(--store-surface-text)] ${errors.addressDetail ? 'border-red-500 text-red-600 focus:border-red-500' : 'border-[var(--store-border)] text-[var(--store-text-main)] focus:border-[var(--store-primary)]'}`}
                                                placeholder="Dirección exacta *"
                                            />
                                            <AnimatePresence>
                                                {errors.addressDetail && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.addressDetail}</motion.p>}
                                            </AnimatePresence>
                                        </div>
                                        <div className="w-full relative">
                                            <input
                                                value={clientData.reference}
                                                onChange={(e) => setClientData({ ...clientData, reference: e.target.value })}
                                                className="w-full bg-transparent border-0 border-b border-[var(--store-border)] py-3 text-base font-bold text-[var(--store-text-main)] outline-none focus:ring-0 focus:border-[var(--store-primary)] transition-colors rounded-none placeholder:text-[var(--store-surface-text)]"
                                                placeholder="Punto de referencia (Opcional)"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {clientData.deliveryType === "courier" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 pt-4">
                                <div id="field-courier">
                                    <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${errors.courier ? 'text-red-500' : 'text-[var(--store-surface-text)]'}`}>
                                        Agencia de Envío *
                                    </label>
                                    <AnimatePresence>
                                        {errors.courier && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-[10px] font-bold mb-4 px-1">{errors.courier}</motion.p>}
                                    </AnimatePresence>

                                    <div className="grid grid-cols-3 gap-3">
                                        {activeCouriers.map((c) => {
                                            const LogoComponent = CourierLogos[c];
                                            const isSelected = clientData.courier === c;

                                            return (
                                                <button
                                                    key={c}
                                                    onClick={() => {
                                                        setClientData({ ...clientData, courier: c });
                                                        if (errors.courier) setErrors(prev => ({ ...prev, courier: "" }));
                                                    }}
                                                    className={`flex flex-col items-center justify-center gap-3 py-4 rounded-md transition-all border group ${isSelected
                                                        ? "border-[var(--store-primary)] ring-[var(--store-primary)] ring-1 bg-[var(--store-bg)] text-[var(--store-text-main)]"
                                                        : "border-[var(--store-border)] text-[var(--store-surface-text)] hover:border-[var(--store-text-main)] hover:text-[var(--store-text-main)]"
                                                        } ${errors.courier && !isSelected ? 'border-red-500/50 bg-red-50/10' : ''}`}
                                                >
                                                    {LogoComponent && (
                                                        <div className="h-6 w-full flex items-center justify-center px-4">
                                                            <LogoComponent className="h-full w-auto max-w-full" />
                                                        </div>
                                                    )}
                                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                                        {c}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                {clientData.courier && (
                                    <div className="space-y-6 animate-in fade-in pt-2">
                                        <div id="field-identityCard" className="w-full relative">
                                            <input
                                                maxLength={15}
                                                value={clientData.identityCard}
                                                onChange={(e) => {
                                                    setClientData({ ...clientData, identityCard: e.target.value.replace(/[^a-zA-Z0-9-]/g, "") });
                                                    if (errors.identityCard) setErrors(prev => ({ ...prev, identityCard: "" }));
                                                }}
                                                className={`w-full bg-transparent border-0 border-b py-3 text-base font-bold outline-none focus:ring-0 transition-colors rounded-none placeholder:text-[var(--store-surface-text)] ${errors.identityCard ? 'border-red-500 text-red-600 focus:border-red-500' : 'border-[var(--store-border)] text-[var(--store-text-main)] focus:border-[var(--store-primary)]'}`}
                                                placeholder="Cédula de Identidad *"
                                            />
                                            <AnimatePresence>
                                                {errors.identityCard && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.identityCard}</motion.p>}
                                            </AnimatePresence>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div id="field-state" className="w-full relative">
                                                <input
                                                    maxLength={40}
                                                    value={clientData.state}
                                                    onChange={(e) => {
                                                        setClientData({ ...clientData, state: e.target.value.replace(/[<>]/g, "") });
                                                        if (errors.state) setErrors(prev => ({ ...prev, state: "" }));
                                                    }}
                                                    className={`w-full bg-transparent border-0 border-b py-3 text-base font-bold outline-none focus:ring-0 transition-colors rounded-none placeholder:text-[var(--store-surface-text)] ${errors.state ? 'border-red-500 text-red-600 focus:border-red-500' : 'border-[var(--store-border)] text-[var(--store-text-main)] focus:border-[var(--store-primary)]'}`}
                                                    placeholder="Estado *"
                                                />
                                                <AnimatePresence>
                                                    {errors.state && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.state}</motion.p>}
                                                </AnimatePresence>
                                            </div>

                                            <div id="field-city" className="w-full relative">
                                                <input
                                                    maxLength={40}
                                                    value={clientData.city}
                                                    onChange={(e) => {
                                                        setClientData({ ...clientData, city: e.target.value.replace(/[<>]/g, "") });
                                                        if (errors.city) setErrors(prev => ({ ...prev, city: "" }));
                                                    }}
                                                    className={`w-full bg-transparent border-0 border-b py-3 text-base font-bold outline-none focus:ring-0 transition-colors rounded-none placeholder:text-[var(--store-surface-text)] ${errors.city ? 'border-red-500 text-red-600 focus:border-red-500' : 'border-[var(--store-border)] text-[var(--store-text-main)] focus:border-[var(--store-primary)]'}`}
                                                    placeholder="Ciudad *"
                                                />
                                                <AnimatePresence>
                                                    {errors.city && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.city}</motion.p>}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        <div id="field-addressDetail" className="w-full relative">
                                            <input
                                                maxLength={150}
                                                value={clientData.addressDetail}
                                                onChange={(e) => {
                                                    setClientData({ ...clientData, addressDetail: e.target.value.replace(/[<>]/g, "") });
                                                    if (errors.addressDetail) setErrors(prev => ({ ...prev, addressDetail: "" }));
                                                }}
                                                className={`w-full bg-transparent border-0 border-b py-3 text-base font-bold outline-none focus:ring-0 transition-colors rounded-none placeholder:text-[var(--store-surface-text)] ${errors.addressDetail ? 'border-red-500 text-red-600 focus:border-red-500' : 'border-[var(--store-border)] text-[var(--store-text-main)] focus:border-[var(--store-primary)]'}`}
                                                placeholder="Dirección exacta *"
                                            />
                                            <AnimatePresence>
                                                {errors.addressDetail && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.addressDetail}</motion.p>}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mt-6 p-5 bg-[var(--store-bg)] border border-[var(--store-border)] rounded-xl flex items-start gap-4">
                        <div className="p-3 bg-[var(--store-surface)] rounded-full shrink-0 border border-[var(--store-border)]/50">
                            {/* 🚀 Usamos Sparkles (Magia/Servicio) en lugar de Coffee */}
                            <Sparkle size={20} className="text-[var(--store-primary)]" strokeWidth={2} />
                        </div>
                        <div className="flex flex-col">
                            {/* 🚀 Leemos de la BD. Si el tenant no lo ha personalizado, usamos el fallback neutral */}
                            <h3 className="font-black text-sm text-[var(--store-text-main)]">
                                {storeConfig?.shipping_config?.service_title || "Servicio / Experiencia"}
                            </h3>
                            <p className="text-[11px] text-[var(--store-surface-text)] font-medium mt-1 leading-relaxed">
                                {storeConfig?.shipping_config?.service_desc || "Los artículos de tu carrito corresponden a servicios, eventos o productos intangibles. No requieren logística de envío."}
                            </p>
                        </div>
                    </div>
                )}

                {/* 🚀 PAGOS (Modo Único / Mixto) - BRUTALIST UI */}
                <div className="space-y-6">
                    <h2 className="text-[10px] font-black text-[var(--store-surface-text)] uppercase tracking-widest pb-3">
                        Pagos
                    </h2>

                    {isFullyCoveredByCredit ? (
                        // 🚀 BLOQUE EXCLUSIVO: 100% CUBIERTO POR CRÉDITO (Clean Look, Sombras Ultradiufuminadas)
                        <div className="bg-emerald-50/40 p-6 rounded-3xl border border-emerald-100/50 flex flex-col gap-4 animate-in fade-in shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-black text-white rounded-full shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                    <Check size={18} strokeWidth={3} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-emerald-950 uppercase tracking-widest mb-1">Compra 100% Cubierta</h3>
                                    <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                                        Tu Crédito de Tienda cubre la totalidad de la orden (${grandTotalUSD_before_credit.toFixed(2)} USD). No necesitas seleccionar ningún otro método de pago ni realizar transferencias.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // 🚀 FLUJO DE PAGO NORMAL (Si aún queda saldo pendiente)
                        <>
                            {/* 🚀 BIFURCADOR (Tabs Tipográficas Limpias) */}
                            {allowSplitPayments && (
                                <div className="flex gap-6 border-b border-[var(--store-border)] w-full mb-8">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPaymentMode("single");
                                            setSplitPayments([]);
                                            setActivePaymentInput(null);
                                            if (errors.payment) setErrors(prev => ({ ...prev, payment: "" }));
                                        }}
                                        className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${paymentMode === "single" ? "border-b-2 border-[var(--store-primary)] text-[var(--store-text-main)]" : "text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] border-b-2 border-transparent"}`}
                                    >
                                        Pago Único
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPaymentMode("split");
                                            setSplitPayments([]);
                                            setActivePaymentInput(null);
                                            if (errors.payment) setErrors(prev => ({ ...prev, payment: "" }));
                                        }}
                                        className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${paymentMode === "split" ? "border-b-2 border-[var(--store-primary)] text-[var(--store-text-main)]" : "text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] border-b-2 border-transparent"}`}
                                    >
                                        Pago Mixto
                                    </button>
                                </div>
                            )}

                            {/* 1. EL LEDGER TIPOGRÁFICO MONOLÍTICO */}
                            {remainingListUSD > 0.01 ? (
                                <div className="py-4 flex flex-col items-center justify-center text-center">
                                    <span className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest mb-4">
                                        Total Pendiente
                                    </span>
                                    <div className="flex items-baseline justify-center gap-1.5">
                                        <span className="text-xl md:text-2xl font-bold text-[var(--store-surface-text)]">
                                            Bs
                                        </span>
                                        <span className="font-black text-5xl md:text-6xl text-[var(--store-text-main)] leading-none tracking-tighter">
                                            {remainingBs.toLocaleString("es-VE", {
                                                maximumFractionDigits: 2,
                                            })}
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium text-[var(--store-surface-text)] mt-4">
                                        Ref: ${remainingListUSD.toFixed(2)}
                                    </span>

                                    {/* Nudge sin caja */}
                                    {remainingListUSD > 0.01 && fxMultiplier > 1 && (
                                        <span className="text-xs font-bold text-[var(--store-incentive)] mt-4 tracking-wide">
                                            {isHardCurrencyPayment
                                                ? "Resta en Divisa"
                                                : "Si pagas en divisa"}
                                            :{" "}
                                            <span className="font-black">
                                                ${remainingCashUSD.toFixed(2)}
                                            </span>
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="py-8 flex flex-col items-center justify-center text-center text-[var(--store-text-main)]">
                                    <Check
                                        size={40}
                                        strokeWidth={2}
                                        className="mb-4 text-[var(--store-incentive)]"
                                    />
                                    <p className="font-black text-2xl tracking-tight">
                                        Monto Cubierto
                                    </p>
                                    <p className="text-sm font-medium text-[var(--store-surface-text)] mt-2">
                                        {paymentMode === "single"
                                            ? "Adjunta el comprobante para finalizar."
                                            : "El total ha sido cubierto. Envía el pedido."}
                                    </p>
                                </div>
                            )}

                            {/* 2. LISTA DE PAGOS AÑADIDOS */}
                            <AnimatePresence>
                                {paymentMode === "split" && splitPayments.length > 0 && (
                                    <div className="divide-y divide-[var(--store-border)] border-t border-b border-[var(--store-border)] py-2 mt-4">
                                        {splitPayments.map((block) => {
                                            const requiresReceipt =
                                                receiptConfig.strict_mode &&
                                                block.method !== "Efectivo" &&
                                                block.method !== "Pago Flash" &&
                                                block.method !== "PayPal";

                                            return (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    key={block.id}
                                                    className="py-5 overflow-hidden"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-3 text-[var(--store-text-main)]">
                                                            <span className="font-bold text-sm">
                                                                {block.method}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <span className="font-black text-lg text-[var(--store-text-main)] tracking-tight">
                                                                {block.currency === "usd"
                                                                    ? `$${block.amount.toFixed(2)}`
                                                                    : `Bs ${block.amount.toLocaleString("es-VE", { maximumFractionDigits: 2 })}`}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removePaymentBlock(block.id)}
                                                                className="text-[var(--store-surface-text)] hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {requiresReceipt && (
                                                        <div className="mt-4 pt-2">
                                                            {!block.receiptFile ? (
                                                                <div className="relative">
                                                                    <input
                                                                        type="file"
                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                        accept="image/*"
                                                                        onChange={(e) =>
                                                                            e.target.files &&
                                                                            handleAttachReceipt(
                                                                                block.id,
                                                                                e.target.files[0],
                                                                            )
                                                                        }
                                                                    />
                                                                    <div className="w-full py-4 border-b border-dashed border-[var(--store-border)] flex items-center justify-center gap-2 font-bold text-[11px] text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] hover:border-[var(--store-text-main)] transition-all cursor-pointer">
                                                                        <Upload size={14} /> Subir Capture de{" "}
                                                                        {block.method} *
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-between items-center bg-[var(--store-bg)] px-4 py-3 rounded-md border border-[var(--store-border)]">
                                                                    <div className="flex items-center gap-3 min-w-0 text-[var(--store-text-main)]">
                                                                        <Check
                                                                            size={16}
                                                                            className="shrink-0 text-[var(--store-incentive)]"
                                                                        />
                                                                        <span className="text-xs font-bold truncate">
                                                                            {block.receiptFile.name}
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleAttachReceipt(block.id, null)
                                                                        }
                                                                        className="p-1.5 text-[var(--store-surface-text)] hover:text-red-500 hover:bg-[var(--store-surface)] rounded-full transition-colors shrink-0"
                                                                    >
                                                                        <X size={14} strokeWidth={3} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </AnimatePresence>

                            {/* 3. SELECTOR DE MÉTODOS */}
                            {(paymentMode === "single" || remainingListUSD > 0.01) && (
                                <div id="field-payment" className="mt-4">
                                    <AnimatePresence>
                                        {errors.payment && (
                                            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-[10px] font-bold mb-2 px-1">
                                                {errors.payment}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1 rounded-lg transition-colors border-0">
                                        {activePaymentMethods.map((pm) => {
                                            const config = getPaymentConfig(pm);
                                            return (
                                                <button
                                                    key={pm}
                                                    type="button"
                                                    onClick={() => {
                                                        openPaymentInput(pm);
                                                        if (errors.payment) setErrors(prev => ({ ...prev, payment: "" }));
                                                    }}
                                                    className={`flex items-center justify-center gap-2 px-4 py-4 text-xs font-bold rounded-md transition-all duration-200 active:scale-[0.98] ${activePaymentInput === pm ? config.btnSelected : config.btnIdle} ${errors.payment && !activePaymentInput ? 'border-red-500/50 hover:border-red-500 text-red-600' : ''}`}
                                                >
                                                    <config.icon
                                                        size={20}
                                                        className={
                                                            activePaymentInput === pm
                                                                ? "text-[var(--store-primary-text)]"
                                                                : errors.payment && !activePaymentInput ? "text-red-500" : "text-[var(--store-text-main)]"
                                                        }
                                                    />{" "}
                                                    {pm}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 4. EL PORTAL DE PAGO INLINE */}
                            <AnimatePresence>
                                {activePaymentInput && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        {(() => {
                                            const singlePaymentBlock =
                                                paymentMode === "single"
                                                    ? splitPayments.find(
                                                        (p) => p.method === activePaymentInput,
                                                    )
                                                    : null;

                                            return (
                                                <div className="mt-6 pt-6 border-t border-[var(--store-border)] flex flex-col gap-6">
                                                    {activePaymentInput === "Pago Flash" ? (
                                                        <div className="mt-4 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl flex items-center gap-4">
                                                            <div className="bg-white p-2.5 rounded-xl border border-gray-100 shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                                                                <Zap size={20} className="text-gray-900" strokeWidth={1.5} />
                                                            </div>
                                                            <p className="text-xs font-medium text-gray-500 leading-relaxed">
                                                                <strong className="text-gray-900 font-bold block mb-0.5">Confirmación Automática</strong>
                                                                Transfiere desde tu banco y tu orden se aprobará en segundos.
                                                            </p>
                                                        </div>
                                                    ) : activePaymentInput === "PayPal" ? (
                                                        <div className="mt-4 animate-in fade-in zoom-in-95 duration-300">
                                                            <PayPalGateway
                                                                storeId={storeId}
                                                                clientId={payments.paypal?.client_id}
                                                                amount={paymentMode === "single" ? totalCashUSD : parseFloat(paymentAmount || "0")}
                                                                onSuccess={(transactionId) => {
                                                                    const finalAmount = paymentMode === "single" ? totalCashUSD : parseFloat(paymentAmount);

                                                                    setSplitPayments(prevPayments => {
                                                                        if (paymentMode === "single") {
                                                                            return [{
                                                                                id: `pay-${Date.now()}`,
                                                                                method: "PayPal",
                                                                                amount: finalAmount,
                                                                                currency: "usd",
                                                                                isHardCurrency: true,
                                                                                receiptFile: null,
                                                                                receipt_url: `PayPal TxID: ${transactionId}`
                                                                            }];
                                                                        } else {
                                                                            return [
                                                                                ...prevPayments,
                                                                                {
                                                                                    id: `pay-${Date.now()}`,
                                                                                    method: "PayPal",
                                                                                    amount: finalAmount,
                                                                                    currency: "usd",
                                                                                    isHardCurrency: true,
                                                                                    receiptFile: null,
                                                                                    receipt_url: `PayPal TxID: ${transactionId}`
                                                                                }
                                                                            ];
                                                                        }
                                                                    });

                                                                    setActivePaymentInput(null);
                                                                    setPaymentAmount("");
                                                                    setAutoSubmitTrigger(true);
                                                                }}
                                                            />
                                                        </div>
                                                    ) : paymentMode === "split" ? (
                                                        <>
                                                            <div className="flex justify-between items-end gap-6">
                                                                <div className="relative flex-1 group">
                                                                    <label className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest mb-2 block">
                                                                        Monto con {activePaymentInput}
                                                                    </label>
                                                                    <div className="flex items-baseline border-b-2 border-[var(--store-border)] group-focus-within:border-[var(--store-primary)] transition-colors pb-2">
                                                                        <span className="font-black text-3xl text-[var(--store-surface-text)] mr-2">
                                                                            {hardCurrencyMethods.includes(
                                                                                activePaymentInput,
                                                                            )
                                                                                ? "$"
                                                                                : "Bs"}
                                                                        </span>
                                                                        <input
                                                                            type="text"
                                                                            inputMode="decimal"
                                                                            autoFocus
                                                                            value={
                                                                                paymentAmount
                                                                                    ? paymentAmount
                                                                                        .split(".")
                                                                                        .map((p, i) =>
                                                                                            i === 0
                                                                                                ? p.replace(
                                                                                                    /\B(?=(\d{3})+(?!\d))/g,
                                                                                                    ".",
                                                                                                )
                                                                                                : p,
                                                                                        )
                                                                                        .join(",")
                                                                                    : ""
                                                                            }
                                                                            onChange={(e) => {
                                                                                let val = e.target.value;
                                                                                val = val.replace(/\./g, "");
                                                                                val = val.replace(/,/g, ".");
                                                                                val = val.replace(/[^0-9.]/g, "");
                                                                                const parts = val.split(".");
                                                                                if (parts.length > 2)
                                                                                    val =
                                                                                        parts[0] +
                                                                                        "." +
                                                                                        parts.slice(1).join("");
                                                                                if (parts[1] && parts[1].length > 2)
                                                                                    val =
                                                                                        parts[0] +
                                                                                        "." +
                                                                                        parts[1].substring(0, 2);
                                                                                if (val.length > 12) return;
                                                                                setPaymentAmount(val);
                                                                            }}
                                                                            className="w-full bg-transparent font-black text-3xl md:text-4xl accent-[var(--store-primary)] h-4 border-0 py-6  text-[var(--store-text-main)] outline-none focus:ring-0 focus:shadow-none focus:border-[var(--store-border)] transition-colors rounded-none placeholder:text-[var(--store-surface-text)]"
                                                                            placeholder="0,00"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={confirmPaymentBlock}
                                                                    className="px-6 py-4 rounded-md font-black text-xs uppercase tracking-widest transition-all bg-[var(--store-primary)] text-[var(--store-primary-text)] hover:opacity-90 flex items-center justify-center shrink-0"
                                                                >
                                                                    Añadir
                                                                </button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        (() => {
                                                            const canUploadReceipt = activePaymentInput !== "Efectivo" && activePaymentInput !== "Pago Flash";
                                                            const isMandatory =
                                                                receiptConfig.strict_mode && canUploadReceipt;

                                                            return (
                                                                <>
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <p className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest mb-1">
                                                                                Total a cancelar
                                                                            </p>
                                                                            <p className="font-black text-3xl md:text-4xl text-[var(--store-text-main)] leading-none tracking-tighter">
                                                                                {hardCurrencyMethods.includes(activePaymentInput)
                                                                                    ? `$${targetCashAmount.toFixed(2)}`
                                                                                    : `Bs ${(targetListAmount * activeRate).toLocaleString("es-VE", { maximumFractionDigits: 2 })}`}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {canUploadReceipt && singlePaymentBlock && (
                                                                        <div className="pt-2">
                                                                            {!singlePaymentBlock.receiptFile ? (
                                                                                <div className="relative">
                                                                                    <input
                                                                                        type="file"
                                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                                        accept="image/*"
                                                                                        onChange={(e) =>
                                                                                            e.target.files &&
                                                                                            handleAttachReceipt(
                                                                                                singlePaymentBlock.id,
                                                                                                e.target.files[0],
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                    <div className="w-full py-4 border-b border-dashed border-[var(--store-border)] flex items-center gap-3 font-bold text-xs text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] hover:border-[var(--store-text-main)] transition-colors cursor-pointer">
                                                                                        <Upload size={16} /> Subir Capture de{" "}
                                                                                        {activePaymentInput}{" "}
                                                                                        {isMandatory ? (
                                                                                            "*"
                                                                                        ) : (
                                                                                            <span className="font-medium text-[var(--store-surface-text)]">
                                                                                                (Opcional)
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex justify-between items-center bg-[var(--store-bg)] px-4 py-3 rounded-md border border-[var(--store-border)]">
                                                                                    <div className="flex items-center gap-3 min-w-0 text-[var(--store-text-main)]">
                                                                                        <Check
                                                                                            size={16}
                                                                                            className="shrink-0 text-[var(--store-incentive)]"
                                                                                        />
                                                                                        <span className="text-xs font-bold truncate">
                                                                                            {singlePaymentBlock.receiptFile.name}
                                                                                        </span>
                                                                                    </div>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            handleAttachReceipt(
                                                                                                singlePaymentBlock.id,
                                                                                                null,
                                                                                            )
                                                                                        }
                                                                                        className="p-1 text-[var(--store-surface-text)] hover:text-red-500 hover:bg-[var(--store-surface)] transition-colors shrink-0"
                                                                                    >
                                                                                        <X size={16} />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* 🚀 FORMULARIO LEGAL DE VUELTO VIRTUAL (EFECTIVO SMART TENDER) */}
                                                                    {activePaymentInput === 'Efectivo' && paymentMode === 'single' && (
                                                                        <div className="mt-8 pt-6 border-t border-[var(--store-border)] animate-in fade-in slide-in-from-top-2">
                                                                            <label className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest block mb-3">
                                                                                ¿Con cuánto vas a pagar? (Monto en Billetes)
                                                                            </label>

                                                                            <div className="flex flex-wrap gap-2 mb-4">
                                                                                {smartTenderOptions.map((amount, idx) => {
                                                                                    const isExact = amount === targetCashAmount;
                                                                                    return (
                                                                                        <button
                                                                                            key={idx}
                                                                                            type="button"
                                                                                            onClick={() => setTenderedAmountStr(amount.toString())}
                                                                                            className={`px-4 py-2.5 rounded-md text-xs font-bold transition-all border ${tenderedAmountStr === amount.toString() ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)] shadow-[0_8px_30px_rgb(0,0,0,0.04)]' : 'bg-[var(--store-surface)] text-[var(--store-text-main)] border-[var(--store-border)] hover:bg-[var(--store-primary)/10] hover:text-[var(--store-primary)]'}`}
                                                                                        >
                                                                                            ${amount.toFixed(2)} {isExact && '(Exacto)'}
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>

                                                                            <div className="relative flex items-center">
                                                                                <span className="absolute left-5 text-[var(--store-text-main)] font-black text-lg">$</span>
                                                                                <input
                                                                                    type="text"
                                                                                    inputMode="decimal"
                                                                                    value={tenderedAmountStr}
                                                                                    onChange={(e) => {
                                                                                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                                                                                        setTenderedAmountStr(val);
                                                                                    }}
                                                                                    placeholder={targetCashAmount.toFixed(2)}
                                                                                    className={`w-full bg-white border focus:border-black rounded-2xl py-4 pl-12 pr-4 text-xl font-black text-[var(--store-text-main)] outline-none transition-all shadow-[0_8px_30px_rgb(0,0,0,0.02)] ${tenderedAmount < targetCashAmount && tenderedAmountStr !== '' ? 'border-red-500 text-red-600' : 'border-gray-200'}`}
                                                                                />
                                                                            </div>

                                                                            <div className="mt-3 px-1">
                                                                                {tenderedAmountStr === '' ? null : tenderedAmount < targetCashAmount ? (
                                                                                    <p className="text-xs font-bold text-red-500 flex items-center gap-1.5"><AlertCircle size={14} /> Faltan ${(targetCashAmount - tenderedAmount).toFixed(2)}</p>
                                                                                ) : tenderedAmount === targetCashAmount ? (
                                                                                    <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><Check size={14} /> Monto exacto. No requiere vuelto.</p>
                                                                                ) : changeError ? (
                                                                                    <p className="text-xs font-bold text-red-500 flex items-center gap-1.5"><AlertCircle size={14} /> {changeError}</p>
                                                                                ) : null}
                                                                            </div>

                                                                            <AnimatePresence>
                                                                                {expectedChange > 0 && !changeError && (
                                                                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-5 bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                                                                        <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-3">
                                                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vuelto a tu favor</span>
                                                                                            <span className="font-black text-2xl text-black tracking-tight">${expectedChange.toFixed(2)}</span>
                                                                                        </div>

                                                                                        <p className="text-[10px] text-gray-500 font-medium leading-relaxed mb-5">
                                                                                            * El saldo a favor es un crédito de consumo exclusivo para esta tienda, sin fecha de caducidad. No equivale a dinero electrónico ni es canjeable por divisas físicas.
                                                                                        </p>

                                                                                        <label className="flex items-start gap-4 cursor-pointer group bg-gray-50 p-4 rounded-2xl border border-transparent hover:bg-gray-100 transition-colors">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={isVirtualChangeAccepted}
                                                                                                onChange={(e) => setIsVirtualChangeAccepted(e.target.checked)}
                                                                                                className="mt-0.5 w-5 h-5 accent-black rounded-md border-gray-300 cursor-pointer"
                                                                                            />
                                                                                            <span className={`text-xs font-bold leading-snug transition-colors ${errors.virtualChange && !isVirtualChangeAccepted ? 'text-red-600' : 'text-gray-900 group-hover:text-black'}`}>
                                                                                                Acepto recibir mi vuelto de ${expectedChange.toFixed(2)} como Crédito de Tienda.
                                                                                            </span>
                                                                                        </label>

                                                                                        <AnimatePresence>
                                                                                            {isVirtualChangeAccepted && !currentUser && (
                                                                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-5 pt-5 border-t border-gray-100 overflow-hidden">
                                                                                                    <span className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${errors.otp && !otpVerified ? 'text-red-500' : 'text-gray-400'}`}>Protege tu saldo (Autenticación)</span>

                                                                                                    {!otpSent ? (
                                                                                                        <div className="flex flex-col sm:flex-row gap-3">
                                                                                                            <input
                                                                                                                type="email"
                                                                                                                placeholder="Tu correo electrónico"
                                                                                                                value={changeEmail}
                                                                                                                onChange={(e) => setChangeEmail(e.target.value.toLowerCase().trim())}
                                                                                                                // w-full para móvil, flex-1 para desktop
                                                                                                                className={`w-full sm:flex-1 bg-white border rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none focus:border-black transition-colors ${errors.otp ? 'border-red-500' : 'border-gray-200'}`}
                                                                                                            />
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={handleSendOtp}
                                                                                                                disabled={isOtpProcessing || !changeEmail}
                                                                                                                // w-full en móvil, w-auto en desktop, shrink-0 para evitar compresión, py-3.5 para igualar altura del input
                                                                                                                className="w-full sm:w-auto shrink-0 bg-black text-white px-6 py-3.5 rounded-xl font-bold text-xs hover:bg-gray-800 disabled:opacity-50 transition-colors active:scale-95 flex items-center justify-center"
                                                                                                            >
                                                                                                                {isOtpProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Verificar'}
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    ) : (
                                                                                                        <div className="flex flex-col gap-3">
                                                                                                            <p className="text-[11px] text-gray-500 font-medium">Ingresa el código de 6 dígitos enviado a <strong className="text-black">{changeEmail}</strong></p>
                                                                                                            <div className="flex flex-col sm:flex-row gap-3">
                                                                                                                <input
                                                                                                                    type="text"
                                                                                                                    maxLength={6}
                                                                                                                    placeholder="000000"
                                                                                                                    value={otpCode}
                                                                                                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                                                                                                    // w-full para móvil, flex-1 para desktop
                                                                                                                    className="w-full sm:flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-center tracking-[0.7em] font-black text-xl text-gray-900 outline-none focus:border-black transition-colors"
                                                                                                                />
                                                                                                                <button
                                                                                                                    type="button"
                                                                                                                    onClick={handleVerifyOtp}
                                                                                                                    disabled={isOtpProcessing || otpCode.length < 6}
                                                                                                                    // w-full en móvil, w-auto en desktop, min-w-[120px] y shrink-0 para proteger el layout
                                                                                                                    className="w-full sm:w-auto shrink-0 bg-black text-white px-6 py-3.5 rounded-xl font-bold text-xs hover:bg-gray-800 disabled:opacity-50 transition-colors active:scale-95 flex items-center justify-center sm:min-w-[120px]"
                                                                                                                >
                                                                                                                    {isOtpProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar'}
                                                                                                                </button>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </motion.div>
                                                                                            )}
                                                                                        </AnimatePresence>
                                                                                    </motion.div>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            );
                                                        })()
                                                    )}

                                                    {/* 🚀 RECIBO DE DATOS BANCARIOS / INSTRUCCIONES DINÁMICAS */}
                                                    {payments[paymentKeysMap[activePaymentInput]]?.details && (
                                                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] mt-4 animate-in fade-in">
                                                            <div className="flex justify-between items-center mb-3">
                                                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                                    {activePaymentInput === 'Efectivo' ? 'Instrucciones de Pago' : 'Datos para Transferir'}
                                                                </span>

                                                                {activePaymentInput !== 'Efectivo' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCopy(payments[paymentKeysMap[activePaymentInput]]?.details || "")}
                                                                        className="text-gray-400 hover:text-black transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase"
                                                                    >
                                                                        {copied ? <Check size={12} /> : <Copy size={12} />}
                                                                        {copied ? "Copiado" : "Copiar"}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <p className="text-sm font-medium text-gray-500 leading-relaxed whitespace-pre-wrap">
                                                                {payments[paymentKeysMap[activePaymentInput]]?.details}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* El fragmento se cierra correctamente aquí para balancear el bloque normal */}
                        </>
                    )}
                </div>

                {/* 🚀 NUEVO: EL RESUMEN FINANCIERO SE MUEVE AL SCROLL */}
                {/* Ahora hace scroll natural con el contenido, liberando el 40% de la pantalla */}
                <div className="space-y-4 pt-8 border-t border-[var(--store-border)] mt-4 pb-8">
                    <h2 className="text-[10px] font-black text-[var(--store-surface-text)] uppercase tracking-widest pb-2">
                        Resumen de la Orden
                    </h2>

                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center text-sm font-medium text-[var(--store-surface-text)]">
                            <span>Subtotal (Precio de Lista)</span>
                            <span
                                className={
                                    cartEngine.listPromoDiscounts > 0
                                        ? "line-through decoration-[var(--store-border)]"
                                        : ""
                                }
                            >
                                {currencySymbol}
                                {cartEngine.totalListNominal.toFixed(2)}
                            </span>
                        </div>

                        {cartEngine.listPromoDiscounts > 0 && (
                            <div className="flex justify-between items-center text-sm font-black text-red-600 animate-in fade-in">
                                <span>Descuento de Campaña</span>
                                <span>
                                    -{currencySymbol}
                                    {cartEngine.listPromoDiscounts.toFixed(2)}
                                </span>
                            </div>
                        )}

                        {/* 🚀 INYECCIÓN DEL RENGLÓN DE IMPUESTO (SOLO SI APLICA) */}
                        {applyTax && taxAmountListUSD > 0 && (
                            <div className="flex justify-between items-center text-sm font-black text-[var(--store-text-main)] pt-2">
                                <span>I.V.A ({taxPercentage}%)</span>
                                <span>
                                    +{currencySymbol}
                                    {taxAmountListUSD.toFixed(2)}
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between items-center text-sm font-black text-[var(--store-text-main)] pt-2 border-t border-[var(--store-border)]">
                            <span>Subtotal Neto</span>
                            <span>
                                {currencySymbol}
                                {cartEngine.finalBsModeUSD.toFixed(2)}
                            </span>
                        </div>

                        {wholesaleDiscountList > 0 && (
                            <div className="flex justify-between items-center text-sm font-black text-[var(--store-incentive)]">
                                <span>Descuento Mayorista</span>
                                <span>
                                    -{currencySymbol}
                                    {wholesaleDiscountList.toFixed(2)}
                                </span>
                            </div>
                        )}

                        <AnimatePresence>
                            {isHardCurrencyPayment && actualFxSavings > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex justify-between items-center text-sm font-black text-[var(--store-incentive)]"
                                >
                                    <span>Beneficio Pago en Divisa</span>
                                    <span>
                                        -{currencySymbol}
                                        {actualFxSavings.toFixed(2)}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {deliveryCost > 0 && (
                            <div className="flex justify-between items-center text-sm font-bold text-[var(--store-text-main)] mt-1">
                                <span>Delivery / Envío</span>
                                <span>
                                    +{currencySymbol}
                                    {deliveryCost.toFixed(2)}
                                </span>
                            </div>
                        )}

                        {/* 🚀 TARJETA DE CRÉDITO APLICADO (Dentro de la lista de subtotales) */}
                        <AnimatePresence>
                            {appliedCreditUSD > 0 && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex justify-between items-center text-sm font-black text-[var(--store-text-main)] pt-2 border-t border-[var(--store-border)]/50 overflow-hidden">
                                    <span>Crédito de Tienda Aplicado</span>
                                    <span>-{currencySymbol}{appliedCreditUSD.toFixed(2)}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* 🚀 TOGGLE DE SALDO A FAVOR (Fuera de los subtotales, justo debajo) */}
                    {availableCredit > 0 && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 border border-[var(--store-border)] rounded-xl mt-4 cursor-pointer group hover:border-[var(--store-primary)] transition-colors" onClick={() => setApplyCredit(!applyCredit)}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-full transition-colors ${applyCredit ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    <Wallet size={18} strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-[var(--store-text-main)]">Usar Saldo a Favor</span>
                                    <span className="text-[11px] font-bold text-[var(--store-surface-text)]">Disponible: ${availableCredit.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className={`w-12 h-6 rounded-full transition-colors flex items-center p-1 ${applyCredit ? 'bg-[var(--store-primary)]' : 'bg-gray-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${applyCredit ? 'translate-x-6' : 'translate-x-0'}`} />
                            </div>
                        </div>
                    )}

                </div>
            </div>{" "}
            {/* CIERRE DEL CONTENEDOR FLEX-1 (Área de scroll) */}
            {/* 🚀 NUEVO: ACTION BAR ULTRA-COMPACTA (Footer Fijo) */}
            {/* Solo una línea de alto. Usa pb-[env(safe-area-inset-bottom)] para adaptarse al notch de los iPhone */}
            <div className="bg-[var(--store-surface)]/95 backdrop-blur-xl px-5 md:px-8 py-4 shrink-0 z-50 border-t border-[var(--store-border)]/30 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="flex items-center gap-5">
                    {/* Total a la izquierda */}
                    <div className="flex flex-col shrink-0">
                        <span className="text-[9px] font-black text-[var(--store-surface-text)] uppercase tracking-widest leading-none mb-1.5">
                            Total Final
                        </span>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl md:text-3xl font-black text-[var(--store-text-main)] leading-none tracking-tighter">
                                {currencySymbol}
                                {grandTotalUSD.toFixed(2)}
                            </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[var(--store-surface-text)] mt-1.5">
                            Bs{" "}
                            {grandTotalBs.toLocaleString("es-VE", {
                                maximumFractionDigits: 2,
                            })}
                        </span>
                    </div>


                    {/* 🚀 EL MORPHING SUBMIT BUTTON (Aislado de Layout Thrashing) */}
                    <div className="flex-1 flex flex-col justify-end items-end md:items-center relative min-h-[52px]">
                        <div className="w-full h-[52px] relative flex justify-end md:justify-center">
                            <motion.button
                                layout
                                onClick={handleCheckout}
                                // 🚀 BLOQUEO INTELIGENTE: Si falta dinero en efectivo, el botón se bloquea de verdad.
                                disabled={checkoutState !== 'idle' || (activePaymentInput === 'Efectivo' && paymentMode === 'single' && tenderedAmount < targetCashAmount)}
                                style={{ borderRadius: 9999 }}
                                className={`h-full font-black text-xs md:text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-xl overflow-hidden relative z-10 ${checkoutState !== 'idle'
                                    ? "w-[52px] bg-[var(--store-text-main)] text-[var(--store-bg)] mx-auto shrink-0 shadow-black/10"
                                    : (activePaymentInput === 'Efectivo' && paymentMode === 'single' && tenderedAmount < targetCashAmount)
                                        ? "w-full bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed shadow-none" // ESTADO GRIS APAGADO
                                        : "w-full bg-[var(--store-primary)] text-[var(--store-primary-text)] hover:opacity-90 active:scale-[0.98] shadow-black/10"
                                    }`}
                            >
                                <AnimatePresence mode="wait">
                                    {checkoutState === 'validating' ? (
                                        <motion.div key="v" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0 }}>
                                            <Loader2 className="animate-spin" size={20} />
                                        </motion.div>
                                    ) : checkoutState === 'processing' ? (
                                        <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <Loader2 className="animate-spin text-white/50" size={20} />
                                        </motion.div>
                                    ) : checkoutState === 'success' ? (
                                        <motion.div key="s" initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-green-500 rounded-full p-1">
                                            <Check className="text-white" size={20} strokeWidth={3} />
                                        </motion.div>
                                    ) : (activePaymentInput === 'Efectivo' && paymentMode === 'single' && tenderedAmount < targetCashAmount) ? (
                                        // 🚀 AVISO VISUAL DE BOTÓN APAGADO
                                        <motion.div key="inc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 whitespace-nowrap text-gray-400">
                                            <AlertCircle size={16} className="mb-0.5" /> Monto Incompleto
                                        </motion.div>
                                    ) : missingReceipts && isPaidInFull ? (
                                        <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 whitespace-nowrap">
                                            <Upload size={16} className="mb-0.5" /> Adjunta Recibos
                                        </motion.div>
                                    ) : activePaymentInput === "Pago Flash" ? (
                                        <motion.div key="f" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 whitespace-nowrap">
                                            <Zap size={16} className="mb-0.5" /> Continuar a Pago Flash
                                        </motion.div>
                                    ) : (
                                        <motion.div key="o" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 whitespace-nowrap">
                                            <MessageCircle size={16} className="mb-0.5" /> Enviar Pedido
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>

                            {/* 🚀 LABELS FLOTANTES (Labor Illusion Texts) */}
                            <AnimatePresence>
                                {checkoutState === 'validating' && (
                                    <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute -top-6 right-0 md:left-1/2 md:-translate-x-1/2 text-[10px] font-bold text-[var(--store-surface-text)] whitespace-nowrap">
                                        Validando seguridad...
                                    </motion.span>
                                )}
                                {checkoutState === 'processing' && (
                                    <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute -top-6 right-0 md:left-1/2 md:-translate-x-1/2 text-[10px] font-bold text-[var(--store-text-main)] whitespace-nowrap">
                                        Generando orden cifrada...
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* 🚀 MICRO-NUDGE DE ERROR VIVO (Aparece si falta algún dato) */}
                        <AnimatePresence>
                            {/* 🚀 ARQUITECTURA: filter(Boolean) destruye strings vacíos y undefineds fantasma */}
                            {Object.values(errors).filter(Boolean).length > 0 && (
                                <motion.span
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-[9px] font-bold text-red-500 mt-2 tracking-wide uppercase"
                                >
                                    falta rellenar datos
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
            {/* 🚀 MODAL P2P PAGO FLASH (UX MARCA BLANCA) */}
            {/* 🚀 MODAL P2P PAGO FLASH (UX MINIMALISTA & FLUIDO) */}
            <AnimatePresence mode="wait">
                {p2pStep !== 'idle' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={() => p2pStep === 'step1' && setP2pStep('idle')} />

                        <motion.div
                            initial={{ scale: 0.96, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.96, opacity: 0, y: 10 }}
                            transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
                            className="relative bg-white w-full max-w-sm rounded-[28px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col border border-gray-100/50"
                        >
                            <AnimatePresence mode="wait">
                                {/* PASO 1: INSTRUCCIONES */}
                                {p2pStep === 'step1' && (
                                    <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                                        <div className="p-7 text-center">
                                            <h3 className="font-black text-xl text-gray-900 tracking-tight mb-1.5">Transfiere el total</h3>
                                            <p className="text-xs text-gray-500 font-medium mb-6">Realiza el pago móvil exacto a estos datos.</p>
                                            <p className="text-[40px] font-black text-gray-900 tracking-tighter mb-8 leading-none">Bs {grandTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>

                                            <div className="space-y-4 text-left">
                                                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                                    <span className="text-xs text-gray-500 font-medium">Banco Destino</span>
                                                    <span className="text-sm font-bold text-gray-900">{payments.pago_flash?.bank || '0102'}</span>
                                                </div>
                                                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                                    <span className="text-xs text-gray-500 font-medium">Cédula / RIF</span>
                                                    <span className="text-sm font-bold text-gray-900">{payments.pago_flash?.dni}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-500 font-medium">Teléfono</span>
                                                    <span className="text-sm font-bold text-gray-900">{payments.pago_flash?.phone}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                                            <button onClick={() => setP2pStep('idle')} className="px-5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">Cancelar</button>
                                            <button onClick={() => setP2pStep('step2')} className="flex-1 bg-black text-white py-4 rounded-xl font-bold text-xs transition-transform active:scale-95 shadow-sm">Ya transferí</button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* PASO 2: VERIFICACIÓN */}
                                {p2pStep === 'step2' && (
                                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                                        <div className="p-7">
                                            <div className="flex items-center gap-3 mb-6">
                                                <button onClick={() => setP2pStep('step1')} className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full transition-colors"><ArrowLeft size={16} /></button>
                                                <div>
                                                    <h3 className="font-black text-lg text-gray-900 tracking-tight leading-none">Verifica tu pago</h3>
                                                    <p className="text-[10px] text-gray-500 font-medium mt-1">Ingresa los datos desde donde enviaste el dinero.</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <select value={p2pForm.bankCode} onChange={e => setP2pForm({ ...p2pForm, bankCode: e.target.value })} className="w-full bg-gray-50 border border-transparent focus:bg-white p-3.5 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-gray-200 transition-colors focus:shadow-sm">
                                                    <option value="" disabled>¿Desde qué banco pagaste?</option>
                                                    <option value="0102">Banco de Venezuela (0102)</option>
                                                    <option value="0134">Banesco (0134)</option>
                                                    <option value="0105">Mercantil (0105)</option>
                                                    <option value="0108">Provincial (0108)</option>
                                                </select>

                                                <div className="flex gap-2">
                                                    <select value={p2pForm.phoneCode} onChange={e => setP2pForm({ ...p2pForm, phoneCode: e.target.value })} className="w-24 bg-gray-50 border border-transparent focus:bg-white p-3.5 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-gray-200 transition-colors focus:shadow-sm">
                                                        <option value="0414">0414</option><option value="0424">0424</option><option value="0412">0412</option><option value="0416">0416</option><option value="0426">0426</option>
                                                    </select>
                                                    <input placeholder="Teléfono" value={p2pForm.phone} onChange={e => setP2pForm({ ...p2pForm, phone: e.target.value.replace(/\D/g, '') })} maxLength={7} className="flex-1 bg-gray-50 border border-transparent focus:bg-white p-3.5 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-gray-200 transition-colors focus:shadow-sm" />
                                                </div>

                                                <input placeholder="Cédula del titular de la cuenta" value={p2pForm.document} onChange={e => setP2pForm({ ...p2pForm, document: e.target.value.replace(/\D/g, '') })} className="w-full bg-gray-50 border border-transparent focus:bg-white p-3.5 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-gray-200 transition-colors focus:shadow-sm" />

                                                <input placeholder="Últimos 6 dígitos de Referencia" value={p2pForm.reference} onChange={e => setP2pForm({ ...p2pForm, reference: e.target.value.replace(/\D/g, '') })} maxLength={8} className="w-full bg-gray-50 border border-transparent focus:bg-white p-3.5 rounded-xl text-sm font-black text-gray-900 outline-none focus:border-gray-200 transition-colors focus:shadow-sm tracking-widest text-center" />
                                            </div>
                                        </div>

                                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                                            <button onClick={handleVerifyP2P} disabled={isVerifying} className="w-full bg-black text-white py-4 rounded-xl font-bold text-xs transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                                                {isVerifying ? <Loader2 size={16} className="animate-spin text-white" /> : 'Confirmar Pago'}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
