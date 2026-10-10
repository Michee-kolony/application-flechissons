import UserNotifications

// Télécharge l'image envoyée par FCM (fcm_options.image) et l'attache à la notification
class NotificationService: UNNotificationServiceExtension {

    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        bestAttemptContent = request.content.mutableCopy() as? UNMutableNotificationContent

        guard let content = bestAttemptContent,
              let options = content.userInfo["fcm_options"] as? [String: Any],
              let lien = options["image"] as? String,
              let url = URL(string: lien) else {
            terminer()
            return
        }

        URLSession.shared.downloadTask(with: url) { [weak self] fichier, reponse, _ in
            if let fichier = fichier,
               let piece = self?.pieceJointe(fichier: fichier, url: url, mimeType: reponse?.mimeType) {
                content.attachments = [piece]
            }
            self?.terminer()
        }.resume()
    }

    override func serviceExtensionTimeWillExpire() {
        // Délai iOS dépassé : on affiche la notification sans image
        terminer()
    }

    private func terminer() {
        guard let contentHandler = contentHandler, let content = bestAttemptContent else { return }
        self.contentHandler = nil
        contentHandler(content)
    }

    // iOS déduit le type de la pièce jointe de l'extension du fichier
    private func pieceJointe(fichier: URL, url: URL, mimeType: String?) -> UNNotificationAttachment? {
        var extensionFichier = url.pathExtension.lowercased()
        if extensionFichier.isEmpty {
            switch mimeType {
            case "image/png": extensionFichier = "png"
            case "image/gif": extensionFichier = "gif"
            default: extensionFichier = "jpg"
            }
        }

        let destination = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension(extensionFichier)

        do {
            try FileManager.default.moveItem(at: fichier, to: destination)
            return try UNNotificationAttachment(identifier: "image", url: destination)
        } catch {
            return nil
        }
    }
}
