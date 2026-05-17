"use strict";
/**
 * Banner "Modo Admin" — renderizado encima del Tabs cuando el usuario es staff.
 *
 * Tres estados:
 *   - Usuario normal: no renderiza nada.
 *   - Staff sin impersonar: muestra "MODO ADMIN — Abrir panel →".
 *   - Staff impersonando: muestra "VIENDO COMO X — VOLVER" con un botón.
 *
 * La detección se hace leyendo el storage local (poblado en login + tras
 * impersonar). No hace fetch en cada render — sólo cuando se le indica.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminBanner = AdminBanner;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var expo_router_1 = require("expo-router");
var storage_1 = require("../lib/storage");
var admin_1 = require("../lib/admin");
function AdminBanner() {
    var _this = this;
    var insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    var pathname = (0, expo_router_1.usePathname)();
    var _a = (0, react_1.useState)(false), isStaff = _a[0], setIsStaff = _a[1];
    var _b = (0, react_1.useState)(null), impersonating = _b[0], setImpersonating = _b[1];
    var _c = (0, react_1.useState)(false), stopping = _c[0], setStopping = _c[1];
    var reload = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var u, imp;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, storage_1.getUser)()];
                case 1:
                    u = _a.sent();
                    return [4 /*yield*/, (0, admin_1.getImpersonating)()];
                case 2:
                    imp = _a.sent();
                    setIsStaff(!!(u === null || u === void 0 ? void 0 : u.is_staff));
                    setImpersonating(imp);
                    return [2 /*return*/];
            }
        });
    }); }, []);
    // Recargar cuando cambie la ruta — cubre el caso "volví del admin tras
    // empezar/terminar impersonación".
    (0, react_1.useEffect)(function () { reload(); }, [pathname, reload]);
    function handleStop() {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (stopping)
                            return [2 /*return*/];
                        setStopping(true);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, 5, 6]);
                        return [4 /*yield*/, (0, admin_1.stopImpersonation)()];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, reload()];
                    case 3:
                        _b.sent();
                        expo_router_1.router.replace('/(app)/dashboard');
                        return [3 /*break*/, 6];
                    case 4:
                        _a = _b.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        setStopping(false);
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    }
    function handleOpen() {
        expo_router_1.router.push('/(app)/admin');
    }
    // Sin permisos → no se pinta nada.
    if (!isStaff && !impersonating)
        return null;
    // Evita que el banner aparezca dentro de la propia pantalla de admin.
    if ((pathname === null || pathname === void 0 ? void 0 : pathname.startsWith('/(app)/admin')) || (pathname === null || pathname === void 0 ? void 0 : pathname.startsWith('/admin'))) {
        return null;
    }
    var inImpersonation = !!impersonating;
    return (<react_native_1.View style={[styles.wrap, { paddingTop: insets.top, backgroundColor: inImpersonation ? '#ffaa32' : '#2563ff' }]}>
      <react_native_1.View style={styles.row}>
        <react_native_1.View style={{ flex: 1 }}>
          <react_native_1.Text style={styles.eyebrow}>
            {inImpersonation ? 'VIENDO COMO' : 'MODO ADMIN'}
          </react_native_1.Text>
          <react_native_1.Text style={styles.label} numberOfLines={1}>
            {inImpersonation
            ? (impersonating.nombre || impersonating.email)
            : 'Panel de administración disponible'}
          </react_native_1.Text>
        </react_native_1.View>

        {inImpersonation ? (<react_native_1.TouchableOpacity style={styles.cta} onPress={handleStop} disabled={stopping} activeOpacity={0.75}>
            {stopping
                ? <react_native_1.ActivityIndicator size="small" color="#000"/>
                : <react_native_1.Text style={styles.ctaText}>VOLVER</react_native_1.Text>}
          </react_native_1.TouchableOpacity>) : (<react_native_1.TouchableOpacity style={styles.cta} onPress={handleOpen} activeOpacity={0.75}>
            <react_native_1.Text style={styles.ctaText}>ABRIR →</react_native_1.Text>
          </react_native_1.TouchableOpacity>)}
      </react_native_1.View>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    wrap: {
        width: '100%',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 12,
    },
    eyebrow: {
        fontFamily: 'JetBrainsMono-Medium',
        fontSize: 9,
        letterSpacing: 1.4,
        color: 'rgba(0,0,0,0.55)',
        textTransform: 'uppercase',
    },
    label: {
        fontFamily: 'SpaceGrotesk-SemiBold',
        fontSize: 13,
        color: '#000',
        marginTop: 2,
    },
    cta: {
        backgroundColor: '#000',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    ctaText: {
        fontFamily: 'JetBrainsMono-Medium',
        fontSize: 11,
        letterSpacing: 1,
        color: '#fff',
    },
});
