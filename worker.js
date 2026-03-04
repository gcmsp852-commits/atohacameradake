// worker.js
importScripts('jsQR.js');

self.onmessage = function(e) {
    const data = e.data;

    // --------------------------------------------------------
    // Stage C: ROI（切り抜かれた小さな画像）のデコード
    // --------------------------------------------------------
    if (data.type === 'decode') {
        const rawItems = jsQR(data.imageData.data, data.imageData.width, data.imageData.height, {
            inversionAttempts: "dontInvert", // 反転なしで最速化
            extractRawOnly: true,
            multi: true // QRツインの2つを確実に分離する
        });

        const results = [];
        if (rawItems && rawItems.length > 0) {
            const itemsToProcess = Array.isArray(rawItems) ? rawItems : [rawItems];
            for (const raw of itemsToProcess) {
                const decodedNormal = jsQR.resumeDecode(raw, null);
                if (decodedNormal) {
                    const code = decodedNormal.managementCode;
                    const mgmtStr = (code !== undefined) ? (code >>> 0).toString(2).padStart(16, '0') : "0000000000000000";
                    results.push({
                        text: decodedNormal.text,
                        managementCode: code,
                        mgmtStr: mgmtStr,
                        raw: raw
                    });
                }
            }
        }
        self.postMessage({ type: 'decoded', results: results, points: data.points });

    // --------------------------------------------------------
    // フォールバック: Native非対応端末用（フル画像デコード）
    // --------------------------------------------------------
    } else if (data.type === 'decode_full') {
        const rawItems = jsQR(data.imageData.data, data.imageData.width, data.imageData.height, {
            inversionAttempts: "dontInvert",
            extractRawOnly: true,
            multi: true
        });

        const results = [];
        if (rawItems && rawItems.length > 0) {
            const itemsToProcess = Array.isArray(rawItems) ? rawItems : [rawItems];
            for (const raw of itemsToProcess) {
                const decodedNormal = jsQR.resumeDecode(raw, null);
                if (decodedNormal) {
                    const code = decodedNormal.managementCode;
                    const mgmtStr = (code !== undefined) ? (code >>> 0).toString(2).padStart(16, '0') : "0000000000000000";
                    
                    // フル画像の場合は、jsQRが見つけた座標をそのまま使う
                    const loc = raw.location;
                    const pts = [loc.topLeftCorner, loc.topRightCorner, loc.bottomRightCorner, loc.bottomLeftCorner];
                    
                    results.push({
                        text: decodedNormal.text,
                        managementCode: code,
                        mgmtStr: mgmtStr,
                        raw: raw,
                        points: pts
                    });
                }
            }
        }
        self.postMessage({ type: 'decoded_full', results: results });

    // --------------------------------------------------------
    // パスワード入力後: 保存しておいたRAWデータの一括復号
    // --------------------------------------------------------
    } else if (data.type === 'resume_multiple') {
        const results = [];
        for (const raw of data.rawList) {
            const decodedMasked = jsQR.resumeDecode(raw, data.maskArray);
            if (decodedMasked) {
                results.push({
                    text: decodedMasked.text,
                    managementCode: decodedMasked.managementCode,
                    raw: raw
                });
            }
        }
        self.postMessage({ type: 'resumed_multiple', results: results, points: data.points });
    }
};