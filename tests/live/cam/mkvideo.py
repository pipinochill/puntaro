import json, sys, numpy as np, cv2
m = np.array(json.load(open(sys.argv[1])), dtype=np.uint8); out = sys.argv[2]
q = (np.pad(1 - m, 4, constant_values=1) * 255).astype(np.uint8)
q = cv2.resize(q, (300, 300), interpolation=cv2.INTER_NEAREST)
W, H = 640, 480; frames = []
rng = np.random.default_rng(7)
for k in range(12):
    scene = np.full((H, W), 40, np.uint8)                        # dark table
    cv2.rectangle(scene, (150, 40), (500, 450), 25, -1)           # phone body
    src = np.float32([[0, 0], [300, 0], [300, 300], [0, 300]])
    j = k % 3
    dst = np.float32([[210 + j, 110], [440, 95 + j], [455, 330], [200, 345 - j]])  # tilted, slight wobble
    warped = cv2.warpPerspective(q, cv2.getPerspectiveTransform(src, dst), (W, H), borderValue=0)
    mask = cv2.warpPerspective(np.full_like(q, 255), cv2.getPerspectiveTransform(src, dst), (W, H))
    scene = np.where(mask > 0, (warped * 0.85 + 20).astype(np.uint8), scene)  # screen is a bit dim
    scene = cv2.GaussianBlur(scene, (3, 3), 0)
    scene = np.clip(scene.astype(int) + rng.normal(0, 6, scene.shape), 0, 255).astype(np.uint8)
    frames.append(scene)
cv2.imwrite(out.replace('.y4m', '.png'), frames[0])
with open(out, 'wb') as f:
    f.write(f'YUV4MPEG2 W{W} H{H} F10:1 Ip A1:1 C420jpeg\n'.encode())
    for g in frames:
        yuv = cv2.cvtColor(cv2.cvtColor(g, cv2.COLOR_GRAY2BGR), cv2.COLOR_BGR2YUV_I420)
        f.write(b'FRAME\n'); f.write(yuv.tobytes())
print('video ok, opencv reads the still:', repr(cv2.QRCodeDetector().detectAndDecode(frames[0])[0]))
