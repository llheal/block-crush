/**
 * LIFF Integration — LINE Mini App SDK
 */

let liffReady = false;
let liffModule = null;

export async function initLiff(liffId) {
    if (!liffId || liffId === 'YOUR_LIFF_ID') {
        console.log('[LIFF] No LIFF ID provided, running in standalone mode');
        return;
    }

    try {
        liffModule = await import('@line/liff');
        const liff = liffModule.default || liffModule;
        await liff.init({ liffId });
        liffReady = true;
        console.log('[LIFF] Initialized successfully');
    } catch (err) {
        console.warn('[LIFF] Init failed:', err.message);
    }
}

export function isInLineApp() {
    if (!liffReady || !liffModule) return false;
    const liff = liffModule.default || liffModule;
    return liff.isInClient();
}

export async function shareScore(score) {
    if (!liffReady || !liffModule) return;
    const liff = liffModule.default || liffModule;

    if (!liff.isApiAvailable('shareTargetPicker')) {
        console.warn('[LIFF] shareTargetPicker not available');
        return;
    }

    try {
        await liff.shareTargetPicker([
            {
                type: 'flex',
                altText: `Block Crush! Score: ${score}`,
                contents: {
                    type: 'bubble',
                    hero: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '🧱 Block Crush!',
                                weight: 'bold',
                                size: 'xl',
                                align: 'center',
                                color: '#FFD700',
                            },
                            {
                                type: 'text',
                                text: `スコア: ${score.toLocaleString()}`,
                                weight: 'bold',
                                size: 'xxl',
                                align: 'center',
                                color: '#FFFFFF',
                                margin: 'md',
                            },
                            {
                                type: 'text',
                                text: 'このスコアを超えられる？',
                                size: 'sm',
                                align: 'center',
                                color: '#AAAAAA',
                                margin: 'md',
                            },
                        ],
                        paddingAll: '20px',
                        backgroundColor: '#1a1a2e',
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'button',
                                action: {
                                    type: 'uri',
                                    label: 'プレイする',
                                    uri: 'https://liff.line.me/YOUR_LIFF_ID',
                                },
                                style: 'primary',
                                color: '#667eea',
                            },
                        ],
                    },
                },
            },
        ]);
    } catch (err) {
        console.warn('[LIFF] Share failed:', err.message);
    }
}
