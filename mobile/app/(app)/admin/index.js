"use strict";
/**
 * Panel admin móvil.
 *
 * Vistas:
 *   - Header con botón cerrar.
 *   - Stat strip: total de usuarios + total de sesiones (vienen del listado).
 *   - Buscador + lista paginada de usuarios.
 *   - Cada fila muestra email, nombre, total sesiones, última actividad,
 *     badge staff/superuser, y un botón "IMPERSONAR".
 *   - CTA al fondo: cerrar panel.
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var expo_router_1 = require("expo-router");
var theme_1 = require("../../../lib/theme");
var admin_1 = require("../../../lib/admin");
// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
    if (!iso)
        return '—';
    var d = new Date(iso);
    var today = new Date();
    var diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0)
        return 'hoy';
    if (diffDays === 1)
        return 'ayer';
    if (diffDays < 7)
        return "hace ".concat(diffDays, "d");
    if (diffDays < 30)
        return "hace ".concat(Math.floor(diffDays / 7), "sem");
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}
// ─── Pantalla ─────────────────────────────────────────────────────────────────
function AdminScreen() {
    var _this = this;
    var _a;
    var insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    var colors = (0, theme_1.useTheme)().colors;
    var styles = makeStyles(colors);
    var _b = (0, react_1.useState)(''), query = _b[0], setQuery = _b[1];
    var _c = (0, react_1.useState)(''), debouncedQ = _c[0], setDebouncedQ = _c[1];
    var _d = (0, react_1.useState)(null), data = _d[0], setData = _d[1];
    var _e = (0, react_1.useState)(true), loading = _e[0], setLoading = _e[1];
    var _f = (0, react_1.useState)(false), refreshing = _f[0], setRefreshing = _f[1];
    var _g = (0, react_1.useState)(null), error = _g[0], setError = _g[1];
    var _h = (0, react_1.useState)(null), impersonatingId = _h[0], setImpersonatingId = _h[1];
    // Debounce para no machacar el backend con cada tecleo
    (0, react_1.useEffect)(function () {
        var t = setTimeout(function () { return setDebouncedQ(query); }, 250);
        return function () { return clearTimeout(t); };
    }, [query]);
    var load = (0, react_1.useCallback)(function () {
        var args_1 = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args_1[_i] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([], args_1, true), void 0, function (showSpinner) {
            var res, e_1;
            if (showSpinner === void 0) { showSpinner = true; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (showSpinner)
                            setLoading(true);
                        else
                            setRefreshing(true);
                        setError(null);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, (0, admin_1.fetchAdminUsers)(debouncedQ, 1)];
                    case 2:
                        res = _a.sent();
                        setData(res);
                        return [3 /*break*/, 5];
                    case 3:
                        e_1 = _a.sent();
                        setError((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || 'No se pudo cargar la lista de usuarios.');
                        return [3 /*break*/, 5];
                    case 4:
                        setLoading(false);
                        setRefreshing(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }, [debouncedQ]);
    (0, react_1.useEffect)(function () { load(true); }, [load]);
    function handleImpersonate(u) {
        return __awaiter(this, void 0, void 0, function () {
            var e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (impersonatingId)
                            return [2 /*return*/];
                        setImpersonatingId(u.id);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, (0, admin_1.startImpersonation)(u.id)];
                    case 2:
                        _a.sent();
                        expo_router_1.router.replace('/(app)/dashboard');
                        return [3 /*break*/, 5];
                    case 3:
                        e_2 = _a.sent();
                        setError((e_2 === null || e_2 === void 0 ? void 0 : e_2.message) || 'No se pudo impersonar.');
                        return [3 /*break*/, 5];
                    case 4:
                        setImpersonatingId(null);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    // ── Render rows ───────────────────────────────────────────────────────────
    var renderItem = function (_a) {
        var item = _a.item;
        var isImpersonating = impersonatingId === item.id;
        return (<react_native_1.View style={styles.userCard}>
        <react_native_1.View style={styles.userMeta}>
          <react_native_1.View style={styles.userTopRow}>
            <react_native_1.Text style={styles.userName} numberOfLines={1}>
              {item.nombre || item.email}
            </react_native_1.Text>
            {item.is_superuser && <react_native_1.View style={styles.badgeSuperuser}><react_native_1.Text style={styles.badgeText}>SU</react_native_1.Text></react_native_1.View>}
            {item.is_staff && !item.is_superuser && <react_native_1.View style={styles.badgeStaff}><react_native_1.Text style={styles.badgeText}>STAFF</react_native_1.Text></react_native_1.View>}
          </react_native_1.View>
          <react_native_1.Text style={styles.userEmail} numberOfLines={1}>{item.email}</react_native_1.Text>
          <react_native_1.Text style={styles.userStats}>
            {item.total_sesiones} sesiones · última: {formatDate(item.ultima_sesion)}
          </react_native_1.Text>
        </react_native_1.View>

        <react_native_1.TouchableOpacity style={[styles.impersonateBtn, isImpersonating && styles.impersonateBtnLoading]} onPress={function () { return handleImpersonate(item); }} disabled={!!impersonatingId} activeOpacity={0.78}>
          {isImpersonating
                ? <react_native_1.ActivityIndicator size="small" color="#000"/>
                : <react_native_1.Text style={styles.impersonateBtnText}>VER COMO</react_native_1.Text>}
        </react_native_1.TouchableOpacity>
      </react_native_1.View>);
    };
    return (<react_native_1.View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <react_native_1.View style={styles.header}>
        <react_native_1.TouchableOpacity onPress={function () { return expo_router_1.router.back(); }} activeOpacity={0.6} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <react_native_1.Text style={styles.closeIcon}>✕</react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.View style={{ flex: 1 }}>
          <react_native_1.Text style={styles.eyebrow}>ZYFIT CONTROL</react_native_1.Text>
          <react_native_1.Text style={styles.title}>Panel de administración</react_native_1.Text>
        </react_native_1.View>
      </react_native_1.View>

      {/* Stat strip */}
      {data && (<react_native_1.View style={styles.statStrip}>
          <react_native_1.View style={styles.statBlock}>
            <react_native_1.Text style={styles.statValue}>{data.total}</react_native_1.Text>
            <react_native_1.Text style={styles.statLabel}>USUARIOS</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={styles.statDivider}/>
          <react_native_1.View style={styles.statBlock}>
            <react_native_1.Text style={styles.statValue}>{data.results.reduce(function (acc, r) { return acc + r.total_sesiones; }, 0)}</react_native_1.Text>
            <react_native_1.Text style={styles.statLabel}>SESIONES (PG. 1)</react_native_1.Text>
          </react_native_1.View>
        </react_native_1.View>)}

      {/* Search */}
      <react_native_1.View style={styles.searchWrap}>
        <react_native_1.TextInput style={styles.searchInput} placeholder="Buscar por email o nombre" placeholderTextColor={colors.inkMuted} value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false}/>
      </react_native_1.View>

      {/* Error */}
      {error && (<react_native_1.View style={styles.errorBox}>
          <react_native_1.Text style={styles.errorText}>{error}</react_native_1.Text>
        </react_native_1.View>)}

      {/* List */}
      {loading ? (<react_native_1.View style={styles.loadingWrap}>
          <react_native_1.ActivityIndicator color={colors.accent}/>
        </react_native_1.View>) : (<react_native_1.FlatList data={(_a = data === null || data === void 0 ? void 0 : data.results) !== null && _a !== void 0 ? _a : []} keyExtractor={function (u) { return String(u.id); }} renderItem={renderItem} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 10 }} refreshing={refreshing} onRefresh={function () { return load(false); }} ListEmptyComponent={<react_native_1.View style={styles.emptyWrap}>
              <react_native_1.Text style={styles.emptyTitle}>Sin resultados</react_native_1.Text>
              <react_native_1.Text style={styles.emptySub}>Ajusta el filtro o vuelve atrás.</react_native_1.Text>
            </react_native_1.View>}/>)}
    </react_native_1.View>);
}
// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(c) {
    return react_native_1.StyleSheet.create({
        root: { flex: 1, backgroundColor: c.bg },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            paddingHorizontal: 20,
            paddingBottom: 14,
        },
        closeIcon: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 22, color: c.inkPrimary },
        eyebrow: { fontFamily: 'JetBrainsMono-Medium', fontSize: 10, color: c.inkMuted, letterSpacing: 1.6 },
        title: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 22, color: c.inkPrimary, letterSpacing: -0.5, marginTop: 2 },
        statStrip: {
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: 16,
            marginVertical: 12,
            paddingVertical: 14,
            paddingHorizontal: 4,
            backgroundColor: c.cardBg,
            borderWidth: 1,
            borderColor: c.borderDefault,
            borderRadius: 16,
        },
        statBlock: { flex: 1, alignItems: 'center' },
        statValue: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 26, color: c.accent, letterSpacing: -0.6 },
        statLabel: { fontFamily: 'JetBrainsMono-Medium', fontSize: 9, color: c.inkMuted, letterSpacing: 1.3, marginTop: 4 },
        statDivider: { width: 1, height: 32, backgroundColor: c.borderDefault },
        searchWrap: {
            paddingHorizontal: 16,
            marginBottom: 12,
        },
        searchInput: {
            backgroundColor: c.glassBg,
            borderWidth: 1,
            borderColor: c.borderDefault,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontFamily: 'SpaceGrotesk-Regular',
            fontSize: 14,
            color: c.inkPrimary,
        },
        errorBox: {
            marginHorizontal: 16,
            marginBottom: 8,
            padding: 12,
            borderRadius: 10,
            backgroundColor: 'rgba(255,68,68,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255,68,68,0.3)',
        },
        errorText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: '#ff8585' },
        loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        userCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            borderRadius: 16,
            backgroundColor: c.cardBg,
            borderWidth: 1,
            borderColor: c.borderDefault,
        },
        userMeta: { flex: 1, gap: 3 },
        userTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        userName: { flex: 1, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.inkPrimary },
        userEmail: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted },
        userStats: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.inkMuted, letterSpacing: 0.4 },
        badgeStaff: {
            backgroundColor: 'rgba(79,140,255,0.15)',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
        },
        badgeSuperuser: {
            backgroundColor: 'rgba(255,170,50,0.15)',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
        },
        badgeText: {
            fontFamily: 'JetBrainsMono-Medium',
            fontSize: 8,
            letterSpacing: 1.1,
            color: c.inkPrimary,
        },
        impersonateBtn: {
            backgroundColor: c.accent,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 10,
            minWidth: 90,
            alignItems: 'center',
        },
        impersonateBtnLoading: { opacity: 0.6 },
        impersonateBtnText: {
            fontFamily: 'JetBrainsMono-Medium',
            fontSize: 10,
            letterSpacing: 1.2,
            color: '#000',
        },
        emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
        emptyTitle: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16, color: c.inkPrimary },
        emptySub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: c.inkMuted },
    });
}
