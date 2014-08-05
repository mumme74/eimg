#ifndef EIMGDISPLAYER_H
#define EIMGDISPLAYER_H

#include <QtGui/QLabel>
#include <QtGui>

class EImgDisplayer : public QLabel
{
    Q_OBJECT

public:
    EImgDisplayer(QWidget *parent = 0);
    ~EImgDisplayer();
};


#endif // EIMGDISPLAYER_H
